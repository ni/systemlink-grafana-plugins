import React, { useEffect, useMemo, useState } from 'react';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { SystemFields, SystemStaticFields } from 'datasources/system/SystemsQueryBuilder.constants';
import { QBField, QueryBuilderOption, Workspace } from 'core/types';
import { filterXSSField, filterXSSLINQExpression } from 'core/utils';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';

type SystemsQueryBuilderProps = QueryBuilderProps &
    React.HTMLAttributes<Element> & {
        filter?: string;
        globalVariableOptions: QueryBuilderOption[];
        workspaces: Workspace[];
        areDependenciesLoaded: boolean;
    };

export const SystemsQueryBuilder: React.FC<SystemsQueryBuilderProps> = ({
    filter,
    onChange,
    globalVariableOptions,
    workspaces,
    areDependenciesLoaded,
}) => {
    const [fields, setFields] = useState<QBField[]>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

    const sanitizedFilter = useMemo(() => {
        return filterXSSLINQExpression(filter);
    }, [filter]);

    const workspaceField = useMemo(() => {
        const workspaceField = SystemFields.WORKSPACE;
        return {
            ...workspaceField,
            lookup: {
                ...workspaceField.lookup,
                dataSource: [
                    ...(workspaceField.lookup?.dataSource || []),
                    ...workspaces.map(({ id, name }) => (filterXSSField({ label: name, value: id }))),
                ],
            },
        }
    }, [workspaces]);

    useEffect(() => {
        if (!areDependenciesLoaded) {
            return;
        }

        const fields = [workspaceField, ...SystemStaticFields]
            .sort((a, b) => a.label?.localeCompare(b?.label ?? '') ?? 0)
            .map(field => {
                if (field.lookup?.dataSource) {
                    return {
                        ...field,
                        lookup: {
                            dataSource: [...globalVariableOptions.map(filterXSSField), ...field.lookup?.dataSource.map(filterXSSField)],
                        },
                    };
                }
                return field;
            });

        setFields(fields);

        const options = Object.values(fields).reduce((accumulator, fieldConfig) => {
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
        ].map(operation => {
            return {
                ...operation,
                ...callbacks,
            };
        });
        setOperations([...customOperations]);
    }, [globalVariableOptions, workspaceField, areDependenciesLoaded]);

    return (
        <SlQueryBuilder
            customOperations={operations}
            fields={fields}
            messages={queryBuilderMessages}
            onChange={onChange}
            value={sanitizedFilter}
        />
    );
};
