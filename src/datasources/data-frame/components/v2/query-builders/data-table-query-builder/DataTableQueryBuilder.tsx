import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { DataTableQueryBuilderFieldNames, DataTableQueryBuilderFields, DataTableQueryBuilderStaticFields } from "datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants";
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
    dataTableIdOptions?: QueryBuilderOption[];
    dataTableNameOptions?: QueryBuilderOption[];
};

export const DataTableQueryBuilder: React.FC<DataTableQueryBuilderProps> = ({
    filter,
    onChange,
    workspaces,
    globalVariableOptions,
    dataTableNameLookupCallback,
    dataTableIdOptions = [],
    dataTableNameOptions = [],
}) => {
    const [fields, setFields] = useState<Array<QBField | QBFieldWithDataSourceCallback>>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);
    const optionsRef = useRef<Record<string, QueryBuilderOption[]>>({});

    const sanitizedGlobalVariableOptions = useMemo(() => {
        return globalVariableOptions.map(filterXSSField);
    }, [globalVariableOptions]);

    const sanitizedDataTableIdOptions = useMemo(() => {
        const sanitizedResultOptions = dataTableIdOptions.map(filterXSSField);
        return _.uniqBy([...sanitizedGlobalVariableOptions, ...sanitizedResultOptions], 'value');
    }, [sanitizedGlobalVariableOptions, dataTableIdOptions]);

    const sanitizedDataTableNameOptions = useMemo(() => {
        const sanitizedResultOptions = dataTableNameOptions.map(filterXSSField);
        return _.uniqBy([...sanitizedGlobalVariableOptions, ...sanitizedResultOptions], 'value');
    }, [sanitizedGlobalVariableOptions, dataTableNameOptions]);

    const dataTableIdField = useMemo(() => {
        return addOptionsToLookup(DataTableQueryBuilderFields.ID as QBField, sanitizedDataTableIdOptions);
    }, [sanitizedDataTableIdOptions]);

    const dataTableNameField = useMemo(() => {
        const dataTableNamesWithGlobalVariableOptionsCallback = (): QBFieldLookupCallback => {
            return _.debounce(async (query: string, callback: Function) => {
                if (!query?.trim()) {
                    optionsRef.current = {
                        ...optionsRef.current,
                        [DataTableQueryBuilderFieldNames.Name]: sanitizedDataTableNameOptions,
                    };
                    callback(sanitizedDataTableNameOptions);
                    return;
                }

                const options = await dataTableNameLookupCallback(query);
                const sanitizedLookupOptions = options.map(filterXSSField);
                const mergedOptions = _.uniqBy(
                    [...sanitizedDataTableNameOptions, ...sanitizedLookupOptions],
                    'value'
                );
                callback(mergedOptions);

                optionsRef.current = {
                    ...optionsRef.current,
                    [DataTableQueryBuilderFieldNames.Name]: mergedOptions,
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
    }, [dataTableNameLookupCallback, sanitizedDataTableNameOptions]);

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

        const staticFields = DataTableQueryBuilderStaticFields.map(field =>
            field.dataField === DataTableQueryBuilderFieldNames.Id ? dataTableIdField : field
        );

        const mergedFields = [
            ...staticFields,
            ...timeFields,
            workspaceField
        ].map(field => {
            if (field.lookup?.dataSource) {
                const sanitizedLookupOptions = field.lookup.dataSource.map(filterXSSField);
                const mergedOptions = _.uniqBy(
                    [...sanitizedGlobalVariableOptions, ...sanitizedLookupOptions],
                    'value'
                );

                return {
                    ...field,
                    lookup: {
                        dataSource: mergedOptions,
                    },
                };
            }
            return field;
        });

        const fieldsWithName = [...mergedFields, dataTableNameField];

        setFields(fieldsWithName);

        const options = fieldsWithName.reduce((accumulator, fieldConfig) => {
            const lookupDataSource = fieldConfig.lookup?.dataSource;

            if (Array.isArray(lookupDataSource) && fieldConfig.dataField) {
                accumulator[fieldConfig.dataField] = lookupDataSource;
            }

            return accumulator;
        }, {} as Record<string, QueryBuilderOption[]>);

        options[DataTableQueryBuilderFieldNames.Name] = sanitizedDataTableNameOptions;
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

    }, [
        dataTableIdField,
        dataTableNameField,
        workspaceField,
        timeFields,
        sanitizedGlobalVariableOptions,
        sanitizedDataTableNameOptions,
        callbacks,
    ]);

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
