import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import { expressionBuilderCallback, expressionReaderCallback } from "core/query-builder.utils";
import { QBField, QueryBuilderOption, Workspace } from "core/types";
import { filterXSSField } from "core/utils";
import { TestPlansQueryBuilderFields, TestPlansQueryBuilderStaticFields } from "datasources/test-plans/constants/TestPlansQueryBuilder.constants";
import React, { useState, useEffect, useMemo } from "react";
import { SystemAlias } from "shared/types/QuerySystems.types";
import { User } from "shared/types/QueryUsers.types";
import { UsersUtils } from "shared/users.utils";
import { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";

type TestPlansQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[] | null;
    systemAliases: SystemAlias[] | null;
    users: User[] | null;
    globalVariableOptions: QueryBuilderOption[];
};

export const TestPlansQueryBuilder: React.FC<TestPlansQueryBuilderProps> = ({
    filter,
    onChange,
    workspaces,
    systemAliases,
    users,
    globalVariableOptions,
}) => {
    const [fields, setFields] = useState<QBField[]>([]);
    const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

    const addOptionsToLookup = (field: QBField, options: QueryBuilderOption[]) => {
        return {
            ...field,
            lookup: {
                ...field.lookup,
                dataSource: [
                    ...(field.lookup?.dataSource || []),
                    ...options,
                ],
            },
        };
    };

    const workspaceField = useMemo(() => {
        const workspaceField = TestPlansQueryBuilderFields.WORKSPACE;
        if (!workspaces) {
            return null;
        }

        const options = workspaces.map(({ id, name }) => ({ label: name, value: id }))
        return addOptionsToLookup(workspaceField, options);
    }, [workspaces])

    const systemAliasField = useMemo(() => {
        const systemAliasField = TestPlansQueryBuilderFields.SYSTEM_ALIAS_NAME;
        if (!systemAliases) {
            return null;
        }

        return {
            ...systemAliasField,
            lookup: {
                ...systemAliasField.lookup,
                dataSource: [
                    ...(systemAliasField.lookup?.dataSource || []),
                    ...systemAliases.map(({ id, alias }) => ({ label: alias ?? '', value: id })),
                ],
            },
        };
    }, [systemAliases])

    const timeFields = useMemo(() => {
        const timeOptions = [
            { label: 'From', value: '${__from:date}' },
            { label: 'To', value: '${__to:date}' },
            { label: 'Now', value: '${__now:date}' },
        ]

        return [
            addOptionsToLookup(TestPlansQueryBuilderFields.CREATED_AT, timeOptions),
            addOptionsToLookup(TestPlansQueryBuilderFields.ESTIMATED_END_DATE, timeOptions),
            addOptionsToLookup(TestPlansQueryBuilderFields.PLANNED_START_DATE, timeOptions),
            addOptionsToLookup(TestPlansQueryBuilderFields.UPDATED_AT, timeOptions)
        ]
    }, []);

    const usersFields = useMemo(() => {
        if (!users) {
            return;
        }
        const usersMap = users.map(user => ({ label: UsersUtils.getUserNameAndEmail(user), value: user.id }));

        return [
            addOptionsToLookup(TestPlansQueryBuilderFields.ASSIGNED_TO, usersMap),
            addOptionsToLookup(TestPlansQueryBuilderFields.CREATED_BY, usersMap),
            addOptionsToLookup(TestPlansQueryBuilderFields.UPDATED_BY, usersMap),
        ];
    }, [users]);

    useEffect(() => {
        if (!workspaceField || !systemAliasField || !timeFields || !usersFields) {
            return;
        }

        const updatedFields = [...TestPlansQueryBuilderStaticFields, ...timeFields, ...usersFields, systemAliasField, workspaceField].map(field => {
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

    }, [workspaceField, systemAliasField, timeFields, usersFields, globalVariableOptions]);

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
