import React, { useCallback, useEffect, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { OrderBy, TestPlansVariableQuery } from '../types';
import { AutoSizeInput, InlineField, InlineSwitch, Select, VerticalGroup } from '@grafana/ui';
import { validateNumericInput } from 'core/utils';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { TestPlansQueryBuilder } from './query-builder/TestPlansQueryBuilder';
import { recordCountErrorMessages, TAKE_LIMIT } from '../constants/QueryEditor.constants';
import { Workspace } from 'core/types';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { User } from 'shared/types/QueryUsers.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { FloatingError } from 'core/errors';

type Props = QueryEditorProps<TestPlansDataSource, TestPlansVariableQuery>;

export function TestPlansVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [systemAliases, setSystemAliases] = useState<SystemAlias[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [products, setProducts] = useState<ProductPartNumberAndName[] | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();

    const loadSystemAliases = async () => {
      const systemAliases = await datasource.loadSystemAliases();
      setSystemAliases(Array.from(systemAliases.values()));
    };

    loadSystemAliases();

    const loadUsers = async () => {
      const users = await datasource.loadUsers();
      setUsers(Array.from(users.values()));
    };

    loadUsers();

    const loadProducts = async () => {
      const products = await datasource.loadProductNamesAndPartNumbers();
      setProducts(Array.from(products.values()));
    };

    loadProducts();
  }, [datasource]);

  const handleQueryChange = useCallback(
    (query: TestPlansVariableQuery): void => {
      onChange(query);
    }, [onChange]
  );

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const validateRecordCoundValue = (value: number, TAKE_LIMIT: number) => {
    if (isNaN(value) || value < 0) {
      return { message: recordCountErrorMessages.greaterOrEqualToZero, recordCount: value };
    }
    if (value > TAKE_LIMIT) {
      return { message: recordCountErrorMessages.lessOrEqualToTenThousand, recordCount: value };
    }
    return {message: '', recordCount: value };
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    const { message, recordCount } = validateRecordCoundValue(value, TAKE_LIMIT);

    setRecordCountInvalidMessage(message);
    handleQueryChange({ ...query, recordCount });
  };

  const onQueryByChange = (queryBy: string) => {
    if (query.queryBy !== queryBy) {
      query.queryBy = queryBy;
      handleQueryChange({ ...query, queryBy });
    }
  };

  return (
    <>
      <VerticalGroup>
        <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
          <TestPlansQueryBuilder
            filter={query.queryBy}
            workspaces={workspaces}
            systemAliases={systemAliases}
            users={users}
            products={products}
            globalVariableOptions={datasource.globalVariableOptions()}
            onChange={(event: any) => onQueryByChange(event.detail.linq)}
          ></TestPlansQueryBuilder>
        </InlineField>
        <div>
          <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.orderBy}>
            <Select
              options={[...OrderBy] as SelectableValue[]}
              placeholder="Select a field to set the query order"
              onChange={onOrderByChange}
              value={query.orderBy}
              defaultValue={query.orderBy}
              width={26}
            />
          </InlineField>
          <InlineField label="Descending" labelWidth={25} tooltip={tooltips.descending}>
            <InlineSwitch
              onChange={event => onDescendingChange(event.currentTarget.checked)}
              value={query.descending}
            />
          </InlineField>
        </div>
        <InlineField
          label="Take"
          labelWidth={25}
          tooltip={tooltips.recordCount}
          invalid={!!recordCountInvalidMessage}
          error={recordCountInvalidMessage}
        >
          <AutoSizeInput
            minWidth={26}
            maxWidth={26}
            type='number'
            defaultValue={query.recordCount}
            onCommitChange={recordCountChange}
            placeholder="Enter record count"
            onKeyDown={(event) => { validateNumericInput(event) }}
          />
        </InlineField>
      </VerticalGroup >
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}

const tooltips = {
  orderBy: 'This field specifies the query order of the test plans.',
  descending: 'This toggle returns the test plans query in descending order.',
  recordCount: 'This field specifies the maximum number of test plans to return.',
  queryBy: 'This optional field specifies the query filters.'
};
