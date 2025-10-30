import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { DataTableQueryBuilderFieldNames, DataTableQueryBuilderFields, DataTableQueryBuilderStaticFields } from "../constants/DataTableQueryBuilder.constants";
import { QBField, QueryBuilderOption, Workspace } from "core/types";
import { addOptionsToLookup, filterXSSField } from "core/utils";
import { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";
import { expressionBuilderCallbackWithRef, expressionReaderCallbackWithRef } from "core/query-builder.utils";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import _ from "lodash";
import { QBFieldLookupCallback, DataSourceQBLookupCallback, QBFieldWithDataSourceCallback } from "datasources/data-frame/types";

type DataTableQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[];
    globalVariableOptions: QueryBuilderOption[];
    dataTableNameLookupCallback: DataSourceQBLookupCallback;
};

export const DataTableQueryBuilder: React.FC<DataTableQueryBuilderProps> = ({
    filter,
    onChange,
    workspaces,
    globalVariableOptions,
    dataTableNameLookupCallback
}) => {
    const [fields, setFields] = useState<Array<QBField | QBFieldWithDataSourceCallback>>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);
    const optionsRef = useRef<Record<string, QueryBuilderOption[]>>({});

    const dataTableNameField = useMemo(() => {
        const dataTableNamesWithGlobalVariableOptionsCallback = (): QBFieldLookupCallback => {
            return _.debounce(async (query: string, callback: Function) => {
                const options = await dataTableNameLookupCallback(query);
                const optionsWithGlobalVariable = [...globalVariableOptions, ...options].map(filterXSSField);
                callback(optionsWithGlobalVariable);

                optionsRef.current = {
                    ...optionsRef.current,
                    [DataTableQueryBuilderFieldNames.Name]: optionsWithGlobalVariable,
                };
            }, 300) as QBFieldLookupCallback;
        };

        const updatedField = {
            ...DataTableQueryBuilderFields.NAME,
            lookup: {
                ...DataTableQueryBuilderFields.NAME.lookup,
                dataSource: dataTableNamesWithGlobalVariableOptionsCallback()
            }
        };

        return updatedField;
    }, [dataTableNameLookupCallback, globalVariableOptions]);

    const workspaceField = useMemo(() => {
        if (workspaces.length === 0) {
            return null;
        }

        const options = workspaces.map(({ id, name }) => ({ label: name, value: id }));
        return addOptionsToLookup(DataTableQueryBuilderFields.WORKSPACE as QBField, options);
    }, [workspaces]);

    const timeFields = useMemo(() => {
        const timeOptions = [
            { label: 'From', value: '${__from:date}' },
            { label: 'To', value: '${__to:date}' },
            { label: 'Now', value: '${__now:date}' },
        ];

        return [
            addOptionsToLookup(DataTableQueryBuilderFields.CREATED_AT as QBField, timeOptions),
            addOptionsToLookup(DataTableQueryBuilderFields.METADATA_MODIFIED_AT as QBField, timeOptions),
            addOptionsToLookup(DataTableQueryBuilderFields.ROWS_MODIFIED_AT as QBField, timeOptions)
        ];
    }, []);

    const callbacks = useMemo(() => {
        return {
            expressionBuilderCallback: expressionBuilderCallbackWithRef(optionsRef),
            expressionReaderCallback: expressionReaderCallbackWithRef(optionsRef),
        };
    }, []);

    useEffect(() => {
        if (!workspaceField) {
            return;
        }

        const updatedFields = [
            ...DataTableQueryBuilderStaticFields,
            ...timeFields,
            workspaceField
        ].map(field => {
            if (field.lookup?.dataSource) {
                return {
                    ...field,
                    lookup: {
                        dataSource: [...globalVariableOptions, ...field.lookup.dataSource].map(filterXSSField),
                    },
                };
            }
            return field;
        });

        setFields([...updatedFields, dataTableNameField]);

        const options = Object.values(updatedFields).reduce((accumulator, fieldConfig) => {
            if (fieldConfig.lookup && fieldConfig.dataField) {
                accumulator[fieldConfig.dataField] = fieldConfig.lookup.dataSource;
            }

            return accumulator;
        }, {} as Record<string, QueryBuilderOption[]>);

        optionsRef.current = options;

        const customOperations = [
            QueryBuilderOperations.EQUALS,
            QueryBuilderOperations.DOES_NOT_EQUAL,
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

        const keyValueOperations = [
            QueryBuilderOperations.KEY_VALUE_MATCH,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH,
            QueryBuilderOperations.KEY_VALUE_CONTAINS,
            QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS
        ];

        setOperations([...customOperations, ...keyValueOperations]);

    }, [dataTableNameField, workspaceField, timeFields, globalVariableOptions, callbacks]);

    return (
        <SlQueryBuilder
            customOperations={operations}
            fields={fields}
            messages={queryBuilderMessages}
            onChange={onChange}
            value={filter}
        />
    );
};
