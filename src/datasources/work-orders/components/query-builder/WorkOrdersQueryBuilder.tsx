import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { QBField, QueryBuilderOption } from 'core/types';
import { filterXSSField } from 'core/utils';
import {
  WorkOrdersQueryBuilderFields,
  WorkOrdersQueryBuilderStaticFields,
} from 'datasources/work-orders/constants/WorkOrdersQueryBuilder.constants';
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'shared/types/QueryUsers.types';
import { Users } from 'shared/Users';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

type WorkOrdersQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    users?: User[] | null;
    globalVariableOptions: QueryBuilderOption[];
  };

export const WorkOrdersQueryBuilder: React.FC<WorkOrdersQueryBuilderProps> = ({
  filter,
  users,
  onChange,
  globalVariableOptions,
}) => {
  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const usersField = useMemo(() => {
    if (!users) {
      return;
    }
    const assignedTo = WorkOrdersQueryBuilderFields.ASSIGNED_TO;
    const createdBy = WorkOrdersQueryBuilderFields.CREATED_BY;
    const requestedBy = WorkOrdersQueryBuilderFields.REQUESTED_BY;
    const updatedBy = WorkOrdersQueryBuilderFields.UPDATED_BY;

    const usersMap = users.map(user => ({ label: Users.getUserNameAndEmail(user), value: user.id }));

    return [
      {
        ...assignedTo,
        lookup: {
          ...assignedTo.lookup,
          dataSource: [...(assignedTo.lookup?.dataSource || []), ...usersMap],
        },
      },
      {
        ...createdBy,
        lookup: {
          ...createdBy.lookup,
          dataSource: [...(createdBy.lookup?.dataSource || []), ...usersMap],
        },
      },
      {
        ...requestedBy,
        lookup: {
          ...requestedBy.lookup,
          dataSource: [...(requestedBy.lookup?.dataSource || []), ...usersMap],
        },
      },
      {
        ...updatedBy,
        lookup: {
          ...updatedBy.lookup,
          dataSource: [...(updatedBy.lookup?.dataSource || []), ...usersMap],
        },
      },
    ];
  }, [users]);

  useEffect(() => {
    if(!usersField) {
      return;
    }
    const updatedFields = [...WorkOrdersQueryBuilderStaticFields, ...usersField];

    updatedFields.map(field => {
      if (field.lookup?.dataSource) {
        return {
          ...field,
          lookup: {
            dataSource: [...globalVariableOptions, ...field.lookup!.dataSource].map(filterXSSField),
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
    ].map(operation => {
      return {
        ...operation,
        ...callbacks,
      };
    });

    setOperations(customOperations);
  }, [globalVariableOptions, usersField]);

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
};
