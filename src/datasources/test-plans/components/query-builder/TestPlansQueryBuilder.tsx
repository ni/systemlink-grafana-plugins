import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import { expressionBuilderCallback, expressionReaderCallback } from "core/query-builder.utils";
import { QBField, QueryBuilderOption } from "core/types";
import { TestPlansQueryBuilderFields, TestPlansQueryBuilderStaticFields } from "datasources/test-plans/constants/TestPlansQueryBuilder.constants";
import React, { useState, useEffect, useMemo } from "react";
import { ProductPartNumberAndName } from "shared/types/QueryProducts.types";
import { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";

type TestPlansQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
    filter?: string;
    products: ProductPartNumberAndName[] | null;
    globalVariableOptions: QueryBuilderOption[];
};

export const TestPlansQueryBuilder: React.FC<TestPlansQueryBuilderProps> = ({
    filter,
    onChange,
    products,
    globalVariableOptions,
}) => {
    const [fields, setFields] = useState<QBField[]>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

    const productsField = useMemo(() => {
        const productsField = TestPlansQueryBuilderFields.PRODUCT;
        if (!products) {
            return null;
        }

        return {
            ...productsField,
            lookup: {
                ...productsField.lookup,
                dataSource: [
                    ...(productsField.lookup?.dataSource || []),
                    ...products.map(({ partNumber, name }) => (
                        {
                            label: name ? `${name} (${partNumber})` : partNumber,
                            value: partNumber
                        }
                    )),
                ],
            },
        };
    }, [products])

    useEffect(() => {
        if (!productsField) {
            return;
        }

        const updatedFields = [...TestPlansQueryBuilderStaticFields, productsField];

        setFields(updatedFields);

        const options = Object.values(updatedFields).reduce((accumulator, fieldConfig) => {
            if (fieldConfig.lookup) {
                accumulator[fieldConfig.dataField!] = fieldConfig.lookup.dataSource;
            }

            return accumulator;
        }, {} as Record<string, QueryBuilderOption[]>);

        const callbacks = {
            expressionBuilderCallback: expressionBuilderCallback(options),
            expressionReaderCallback: expressionReaderCallback(options),
        };

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
            QueryBuilderOperations.DATE_TIME_IS_BEFORE,
            QueryBuilderOperations.LIST_IS_EMPTY,
            QueryBuilderOperations.LIST_IS_NOT_EMPTY,
            QueryBuilderOperations.LIST_EQUALS,
            QueryBuilderOperations.LIST_DOES_NOT_EQUAL,
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

    }, [globalVariableOptions, productsField]);

    return (
        <SlQueryBuilder
            customOperations={operations}
            fields={fields}
            messages={queryBuilderMessages}
            onChange={onChange}
            value={filter}
            showIcons
        />
    );
}
