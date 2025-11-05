import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { QBField, QueryBuilderOption } from "core/types";
import { filterXSSField } from "core/utils";
import { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";
import { expressionBuilderCallbackWithRef, expressionReaderCallbackWithRef } from "core/query-builder.utils";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import { ColumnsQueryBuilderStaticFields } from "../../constants/ColumnsQueryBuilder.constants";

type ColumnsQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
    filter?: string;
    globalVariableOptions: QueryBuilderOption[];
};

export const ColumnsQueryBuilder: React.FC<ColumnsQueryBuilderProps> = ({
    filter,
    onChange,
    globalVariableOptions
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
            QueryBuilderOperations.DOES_NOT_CONTAIN
        ].map((operation) => {
            return {
                ...operation,
                ...callbacks,
            };
        });
        setOperations([...customOperations]);

    }, [globalVariableOptions, callbacks]);

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
