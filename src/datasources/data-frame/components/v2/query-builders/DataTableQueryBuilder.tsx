import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder"
import React, { useEffect, useMemo, useState } from "react"
import { DataTableQueryBuilderFields, DataTableQueryBuilderStaticFields } from "../constants/DataTableQueryBuilder.constants"
import { QBField, QueryBuilderOption, Workspace } from "core/types";
import { addOptionsToLookup, filterXSSField } from "core/utils";
import { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";
import { expressionBuilderCallbackWithRef, expressionReaderCallbackWithRef } from "core/query-builder.utils";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";

type DataTableQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[] | null;
    globalVariableOptions: QueryBuilderOption[];
};

export const DataTableQueryBuilder: React.FC<DataTableQueryBuilderProps> = ({
    filter,
    onChange,
    workspaces,
    globalVariableOptions,
}) => {
    const [fields, setFields] = useState<QBField[]>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);
    const optionsRef = React.useRef<Record<string, QueryBuilderOption[]>>({});

    const workspaceField = useMemo(() => {
        const workspaceField = DataTableQueryBuilderFields.WORKSPACE;
        if (!workspaces) {
            return null;
        }

        const options = workspaces.map(({ id, name }) => ({ label: name, value: id }))
        return addOptionsToLookup(workspaceField, options);
    }, [workspaces])

    const timeFields = useMemo(() => {
        const timeOptions = [
            { label: 'From', value: '${__from:date}' },
            { label: 'To', value: '${__to:date}' },
            { label: 'Now', value: '${__now:date}' },
        ]

        return [
            addOptionsToLookup(DataTableQueryBuilderFields.CREATED_AT, timeOptions),
            addOptionsToLookup(DataTableQueryBuilderFields.METADATA_MODIFIED_AT, timeOptions),
            addOptionsToLookup(DataTableQueryBuilderFields.ROWS_MODIFIED_AT, timeOptions)
        ]
    }, []);

    const callbacks = useMemo(() => {
        return {
            expressionBuilderCallback: expressionBuilderCallbackWithRef(optionsRef),
            expressionReaderCallback: expressionReaderCallbackWithRef(optionsRef),
        };
    }, [optionsRef]);

    useEffect(() => {
        if (!workspaceField || !timeFields) {
            return;
        }

        const updatedFields = [
            ...DataTableQueryBuilderStaticFields,
            workspaceField,
            ...timeFields,
            DataTableQueryBuilderFields.ID,
            DataTableQueryBuilderFields.NAME,
        ].map(field => {
            if (field.lookup?.dataSource) {
                return {
                    ...field,
                    lookup: {
                        dataSource: [...globalVariableOptions, ...field.lookup?.dataSource].map(filterXSSField),
                    },
                };
            }
            return field;
        });

        setFields(updatedFields);

        const options = Object.values(updatedFields).reduce((accumulator, fieldConfig) => {
            if (fieldConfig.lookup) {
                accumulator[fieldConfig.dataField!] = fieldConfig.lookup.dataSource;
            }

            return accumulator;
        }, {} as Record<string, QueryBuilderOption[]>);

        optionsRef.current = options;

        const customOperations = [
            QueryBuilderOperations.EQUALS,
            QueryBuilderOperations.DOES_NOT_EQUAL,
            QueryBuilderOperations.STARTS_WITH,
            QueryBuilderOperations.ENDS_WITH,
            QueryBuilderOperations.CONTAINS,
            QueryBuilderOperations.DOES_NOT_CONTAIN,
            QueryBuilderOperations.LESS_THAN,
            QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO,
            QueryBuilderOperations.GREATER_THAN,
            QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO,
            QueryBuilderOperations.IS_BLANK,
            QueryBuilderOperations.IS_NOT_BLANK,
            QueryBuilderOperations.DATE_TIME_IS_AFTER,
            QueryBuilderOperations.DATE_TIME_IS_BEFORE
        ].map((operation) => {
            return {
                ...operation,
                ...callbacks,
            };
        });

        const customDateTimeOperations = [
            QueryBuilderOperations.DATE_TIME_IS_BLANK,
            QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK
        ];

        const keyValueOperations = [
            QueryBuilderOperations.KEY_VALUE_MATCH,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH,
            QueryBuilderOperations.KEY_VALUE_CONTAINS,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS
        ];

        setOperations([...customOperations, ...customDateTimeOperations, ...keyValueOperations]);

    }, [workspaceField, timeFields, globalVariableOptions, callbacks]);

    return (
        <SlQueryBuilder
            customOperations={operations}
            fields={fields}
            messages={queryBuilderMessages}
            onChange={onChange}
            value={filter}
        />
    )
}
