import React, { useEffect, useMemo, useState } from 'react';
import { useTheme2 } from '@grafana/ui';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { QBField, QueryBuilderOption, Workspace } from 'core/types';
import { addOptionsToLookup, filterXSSLINQExpression } from 'core/utils';
import { SystemFields, SystemStaticFields } from 'datasources/system/constants/SystemsQueryBuilder.constants';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';

type SystemsQueryBuilderProps = QueryBuilderProps &
    React.HTMLAttributes<Element> & {
        filter?: string;
        globalVariableOptions: QueryBuilderOption[];
        workspaces: Workspace[] | null;
    };

export const SystemsQueryBuilder: React.FC<SystemsQueryBuilderProps> = ({
    filter,
    onChange,
    globalVariableOptions,
    workspaces,
}) => {
    const theme = useTheme2();
    document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

    const [fields, setFields] = useState<QBField[]>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

    const sanitizedFilter = useMemo(() => {
        return filterXSSLINQExpression(filter);
    }, [filter]);

    const workspaceField = useMemo(() => {
        if (!workspaces) {
            return null;
        }
        const workspaceOptions = workspaces.map(({ id, name }) => ({ label: name, value: id }));

        return addOptionsToLookup(SystemFields.WORKSPACE, workspaceOptions);
    }, [workspaces]);

    useEffect(() => {
        if (!workspaceField) {
            return;
        }

        const fields = [...SystemStaticFields, workspaceField].map(field => {
            if (field.lookup?.dataSource) {
                return {
                    ...field,
                    lookup: {
                        dataSource: [...globalVariableOptions, ...field.lookup?.dataSource],
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
            QueryBuilderOperations.CONTAINS,
            QueryBuilderOperations.DOES_NOT_CONTAIN,
        ].map(operation => {
            return {
                ...operation,
                ...callbacks,
            };
        });
        setOperations([...customOperations]);
    }, [globalVariableOptions]);

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
