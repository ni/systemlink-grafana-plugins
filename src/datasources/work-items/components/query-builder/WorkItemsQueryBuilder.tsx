import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { QBField, QueryBuilderOption, Workspace } from 'core/types';
import { addOptionsToLookup, filterXSSField } from 'core/utils';
import {
  WorkItemsQueryBuilderFields,
  WorkItemsQueryBuilderStaticFields,
} from 'datasources/work-items/constants/WorkItemsQueryBuilder.constants';
import React, { useState, useEffect, useMemo } from 'react';
import { SelectableValue } from '@grafana/data';
import { User } from 'shared/types/QueryUsers.types';
import { UsersUtils } from 'shared/users.utils';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

type WorkItemsQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
  filter?: string;
  workspaces: Workspace[] | null;
  users: User[] | null;
  workItemTypes: Array<SelectableValue<string>> | null;
  globalVariableOptions: QueryBuilderOption[];
};

export const WorkItemsQueryBuilder: React.FC<WorkItemsQueryBuilderProps> = ({
  filter,
  workspaces,
  users,
  workItemTypes,
  onChange,
  globalVariableOptions,
}) => {
  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const timeFields = useMemo(() => {
    const timeOptions = [
      { label: 'From', value: '${__from:date}' },
      { label: 'To', value: '${__to:date}' },
      { label: 'Now', value: '${__now:date}' },
    ];

    return [
      addOptionsToLookup(WorkItemsQueryBuilderFields.EARLIEST_START_DATE_TIME, timeOptions),
      addOptionsToLookup(WorkItemsQueryBuilderFields.DUE_DATE_TIME, timeOptions),
      addOptionsToLookup(WorkItemsQueryBuilderFields.PLANNED_START_DATE_TIME, timeOptions),
      addOptionsToLookup(WorkItemsQueryBuilderFields.PLANNED_END_DATE_TIME, timeOptions),
      addOptionsToLookup(WorkItemsQueryBuilderFields.CREATED_AT, timeOptions),
      addOptionsToLookup(WorkItemsQueryBuilderFields.UPDATED_AT, timeOptions),
    ];
  }, []);

  const workspaceField = useMemo(() => {
    if (!workspaces) {
      return null;
    }
    const workspaceOptions = workspaces.map(({ id, name }) => ({ label: name, value: id }));
    return addOptionsToLookup(WorkItemsQueryBuilderFields.WORKSPACE, workspaceOptions);
  }, [workspaces]);

  const usersField = useMemo(() => {
    if (!users) {
      return null;
    }
    const usersMap = users.map(user => ({ label: UsersUtils.getUserNameAndEmail(user), value: user.id }));
    return [
      addOptionsToLookup(WorkItemsQueryBuilderFields.ASSIGNED_TO, usersMap),
      addOptionsToLookup(WorkItemsQueryBuilderFields.REQUESTED_BY, usersMap),
      addOptionsToLookup(WorkItemsQueryBuilderFields.CREATED_BY, usersMap),
      addOptionsToLookup(WorkItemsQueryBuilderFields.UPDATED_BY, usersMap),
    ];
  }, [users]);

  const workItemTypesField = useMemo(() => {
    if (!workItemTypes) {
      return null;
    }
    const typeOptions = workItemTypes.map(t => ({ label: t.label ?? t.value ?? '', value: t.value ?? '' }));
    return addOptionsToLookup(WorkItemsQueryBuilderFields.TYPE, typeOptions);
  }, [workItemTypes]);

  useEffect(() => {
    if (!workspaceField || !timeFields || !usersField || !workItemTypesField) {
      return;
    }

    const updatedFields = [
      ...WorkItemsQueryBuilderStaticFields,
      workItemTypesField,
      ...timeFields,
      workspaceField,
      ...usersField,
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

    setFields(updatedFields);

    const callbacks = {
      expressionBuilderCallback: expressionBuilderCallback(updatedFields),
      expressionReaderCallback: expressionReaderCallback(updatedFields),
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
    ].map(operation => ({
      ...operation,
      ...callbacks,
    }));

    const customDateTimeOperations = [
      QueryBuilderOperations.DATE_TIME_IS_BLANK,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK,
    ];

    const keyValueOperations = [
      QueryBuilderOperations.KEY_VALUE_MATCH,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH,
      QueryBuilderOperations.KEY_VALUE_CONTAINS,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS,
    ];

    setOperations([...customOperations, ...customDateTimeOperations, ...keyValueOperations]);
  }, [globalVariableOptions, timeFields, workspaceField, usersField, workItemTypesField]);

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
