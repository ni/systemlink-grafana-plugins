import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { ColumnsQueryBuilderStaticFields } from "../constants/ColumnsQueryBuilder.constants";
import { QBField, QueryBuilderOption } from "core/types";
import { filterXSSField } from "core/utils";
import { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";
import { expressionBuilderCallbackWithRef, expressionReaderCallbackWithRef } from "core/query-builder.utils";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";

type ColumnsQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
    filter?: string;
    globalVariableOptions: QueryBuilderOption[];
    disabled?: boolean;
};

export const ColumnsQueryBuilder: React.FC<ColumnsQueryBuilderProps> = ({
    filter,
    onChange,
    globalVariableOptions,
    disabled = false
}) => {
    const [fields, setFields] = useState<QBField[]>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);
    const optionsRef = useRef<Record<string, QueryBuilderOption[]>>({});

    const callbacks = useMemo(() => {
        return {
            expressionBuilderCallback: expressionBuilderCallbackWithRef(optionsRef),
            expressionReaderCallback: expressionReaderCallbackWithRef(optionsRef),
        };
    }, []);

    useEffect(() => {
        const updatedFields = ColumnsQueryBuilderStaticFields.map(field => {
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

        setFields(updatedFields);

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
            QueryBuilderOperations.IS_NOT_BLANK
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

    }, [globalVariableOptions, callbacks]);

    return (
        <SlQueryBuilder
            customOperations={operations}
            fields={fields}
            messages={queryBuilderMessages}
            onChange={onChange}
            value={filter}
            disabled={disabled}
        />
    );
};
