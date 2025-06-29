import React, { useCallback, useEffect, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { OrderBy, OutputType, Properties, PropertiesProjectionMap, TestPlansQuery } from '../types';
import { AutoSizeInput, HorizontalGroup, InlineField, InlineSwitch, MultiSelect, RadioButtonGroup, Select, VerticalGroup } from '@grafana/ui';
import { validateNumericInput } from 'core/utils';
import { TestPlansQueryBuilder } from './query-builder/TestPlansQueryBuilder';
import { recordCountErrorMessages, TAKE_LIMIT } from '../constants/QueryEditor.constants';
import { Workspace } from 'core/types';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { User } from 'shared/types/QueryUsers.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { FloatingError } from 'core/errors';

type Props = QueryEditorProps<TestPlansDataSource, TestPlansQuery>;

export function TestPlansQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  const [isPropertiesValid, setIsPropertiesValid] = useState<boolean>(true);  

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [systemAliases, setSystemAliases] = useState<SystemAlias[] | null>(null);
  const [products, setProducts] = useState<ProductPartNumberAndName[] | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();

    const loadUsers = async () => {
      const users = await datasource.loadUsers();
      setUsers(Array.from(users.values()));
    };

    loadUsers();

    const loadSystemAliases = async () => {
      const systemAliases = await datasource.loadSystemAliases();
      setSystemAliases(Array.from(systemAliases.values()));
    };

    loadSystemAliases();

    const loadProducts = async () => {
      const products = await datasource.loadProductNamesAndPartNumbers();
      setProducts(Array.from(products.values()));
    };

    loadProducts();
  }, [datasource]);

  const handleQueryChange = useCallback(
    (query: TestPlansQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    }, [onChange, onRunQuery]
  );

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    setIsPropertiesValid(items.length > 0);
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as Properties) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const validateRecordCoundValue = (value: number, TAKE_LIMIT: number) => {
    if (isNaN(value) || value < 0) {
      return { message: recordCountErrorMessages.greaterOrEqualToZero, take: undefined };
    }
    if (value > TAKE_LIMIT) {
      return { message: recordCountErrorMessages.lessOrEqualToTenThousand, take: undefined };
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
  
  useEffect(() => {
    if (!query.outputType) {
      handleQueryChange({...query, outputType: OutputType.Properties});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <VerticalGroup>
        <InlineField label="Output" labelWidth={25} tooltip={tooltips.outputType}>
          <RadioButtonGroup
            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
            onChange={onOutputTypeChange}
            value={query.outputType}
          />
        </InlineField>
        {query.outputType === OutputType.Properties && (
          <InlineField
            label="Properties" 
            labelWidth={25} 
            tooltip={tooltips.properties}
            invalid={!isPropertiesValid}
            error='You must select at least one property.'
          >
            <MultiSelect
              placeholder="Select the properties to query"
              options={Object.entries(PropertiesProjectionMap).map(([key, value]) => ({ label: value.label, value: key })) as SelectableValue[]}
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties}
              width={65}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
        )}
        <HorizontalGroup align="flex-start">
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
          {query.outputType === OutputType.Properties && (
            <VerticalGroup>
              <div>
                <InlineField label="OrderBy" labelWidth={18} tooltip={tooltips.orderBy}>
                  <Select
                    options={[...OrderBy] as SelectableValue[]}
                    placeholder="Select a field to set the query order"
                    onChange={onOrderByChange}
                    value={query.orderBy}
                    defaultValue={query.orderBy}
                    width={26}
                  />
                </InlineField>
                <InlineField label="Descending" labelWidth={18} tooltip={tooltips.descending}>
                  <InlineSwitch
                    onChange={event => onDescendingChange(event.currentTarget.checked)}
                    value={query.descending}
                  />
                </InlineField>
              </div>
              <InlineField
                label="Take"
                labelWidth={18}
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
            </VerticalGroup>
          )}
        </HorizontalGroup >
      </VerticalGroup>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}

const tooltips = {
  outputType: 'This field specifies the output type to fetch test plan properties or total count.',
  properties: 'This field specifies the properties to use in the query.',
  orderBy: 'This field specifies the query order of the test plans.',
  descending: 'This toggle returns the test plans query in descending order.',
  recordCount: 'This field specifies the maximum number of test plans to return.',
  queryBy: 'This optional field specifies the query filters.'
};
