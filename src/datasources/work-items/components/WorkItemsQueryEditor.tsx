import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  AutoSizeInput,
  Combobox,
  ComboboxOption,
  InlineSwitch,
  MultiCombobox,
  RadioButtonGroup,
  Space,
  Stack,
} from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { FloatingError } from 'core/errors';
import { Workspace } from 'core/types';
import { validateNumericInput } from 'core/utils';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import {
  CONTROL_WIDTH,
  COMBOBOX_WIDTH,
  LABEL_WIDTH,
  OrderBy,
  WorkItemProperties,
  WorkItemTypes,
  labels,
  placeholders,
  propertiesErrorMessages,
  tooltips,
  typesErrorMessages,
} from '../constants/QueryEditor.constants';
import {
  OrderByOptions,
  OutputType,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from '../types';
import { getTakeError, isPropertiesNonEmpty, isTypesNonEmpty } from '../utils';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import { User } from 'shared/types/QueryUsers.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const isPropertiesValid = isPropertiesNonEmpty(query.properties);
  const isTypesValid = isTypesNonEmpty(query.types);
  const takeInvalidMessage = getTakeError(query.take);
  const isTakeValid = takeInvalidMessage === '';

  const propertiesOptions = Object.values(WorkItemProperties).map(property => ({
    label: property.label,
    value: property.value,
    group: property.group,
  }));

  const outputTypeOptions = Object.values(OutputType).map(value => ({
    label: value,
    value,
  }));

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [products, setProducts] = useState<ProductPartNumberAndName[] | null>(null);
  const [systemAliases, setSystemAliases] = useState<SystemAlias[] | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    const loadUsers = async () => {
      const users = await datasource.loadUsers();
      setUsers(Array.from(users.values()));
    };

    const loadProducts = async () => {
      const products = await datasource.loadProductNamesAndPartNumbers();
      setProducts(Array.from(products.values()));
    };

    const loadSystemAliases = async () => {
      const systemAliases = await datasource.loadSystemAliases();
      setSystemAliases(Array.from(systemAliases.values()));
    };

    loadWorkspaces();
    loadUsers();
    loadProducts();
    loadSystemAliases();
  }, [datasource]);

  const globalVariableOptions = useMemo(() => datasource.globalVariableOptions(), [datasource]);

  const handleQueryChange = useCallback(
    (query: WorkItemsQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onTypesChange = (items: Array<ComboboxOption<WorkItemTypeOptions>>) => {
    const types = items.map(item => item.value).filter(Boolean) as WorkItemTypeOptions[];
    handleQueryChange({ ...query, types }, isTypesNonEmpty(types));
  };

  const onPropertiesChange = (items: Array<ComboboxOption<WorkItemPropertiesOptions>>) => {
    const properties = items.map(item => item.value).filter(Boolean) as WorkItemPropertiesOptions[];
    handleQueryChange({ ...query, properties }, isPropertiesNonEmpty(properties));
  };

  const onFilterChange = (linq: string) => {
    if (query.filter !== linq) {
      handleQueryChange({ ...query, filter: linq });
    }
  };

  const onOrderByChange = (item: SelectableValue<OrderByOptions>) => {
    handleQueryChange({ ...query, orderBy: item.value as OrderByOptions });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, take: value }, getTakeError(value) === '');
  };

  return (
    <>
     <Stack direction="column" >
      <InlineField
        label={labels.outputType}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.outputType}
      >
        <RadioButtonGroup
          options={outputTypeOptions}
          onChange={onOutputTypeChange}
          value={query.outputType}
        />
      </InlineField>
      <InlineField
        label={labels.types}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.types}
        invalid={!isTypesValid}
        error={typesErrorMessages.atLeastOneRequired}
      >
        <MultiCombobox
          placeholder={placeholders.types}
          options={WorkItemTypes}
          value={query.types}
          onChange={onTypesChange}
          enableAllOption
          width="auto"
          minWidth={CONTROL_WIDTH}
          maxWidth={CONTROL_WIDTH}
        />
      </InlineField>
      {query.outputType === OutputType.Properties && (
        <>
          <InlineField
            label={labels.properties}
            labelWidth={LABEL_WIDTH}
            tooltip={tooltips.properties}
            invalid={!isPropertiesValid}
            error={propertiesErrorMessages.atLeastOneRequired}
          >
            <MultiCombobox
              placeholder={placeholders.properties}
              options={propertiesOptions}
              value={query.properties}
              onChange={onPropertiesChange}
              width="auto"
              minWidth={CONTROL_WIDTH}
              maxWidth={CONTROL_WIDTH}
            />
          </InlineField>
        </>
      )}
      <Stack>
        <InlineField
          label={labels.queryBy}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.filter}
        >
          <WorkItemsQueryBuilder
            filter={query.filter}
            workspaces={workspaces}
            users={users}
            products={products}
            systemAliases={systemAliases}
            globalVariableOptions={globalVariableOptions}
            onChange={(event: any) => {onFilterChange(event.detail.linq)}}
          />
        </InlineField>
        {query.outputType === OutputType.Properties && (
           <Stack direction="column" gap={0}>
              <InlineField
                label={labels.orderBy}
                labelWidth={LABEL_WIDTH}
                tooltip={tooltips.orderBy}
              >
                <Combobox
                  options={OrderBy}
                  placeholder={placeholders.orderBy}
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  width={COMBOBOX_WIDTH}
                />
              </InlineField>
              <InlineField
                label={labels.descending}
                labelWidth={LABEL_WIDTH}
                tooltip={tooltips.descending}
              >
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            <Space v={1} />
            <InlineField
              label={labels.take}
              labelWidth={LABEL_WIDTH}
              tooltip={tooltips.take}
              invalid={!isTakeValid}
              error={takeInvalidMessage}
            >
              <AutoSizeInput
                minWidth={COMBOBOX_WIDTH}
                maxWidth={COMBOBOX_WIDTH}
                type="number"
                value={query.take}
                onBlur={onTakeChange}
                placeholder={placeholders.take}
                onKeyDown={event => {
                  validateNumericInput(event);
                }}
              />
            </InlineField>
          </Stack>
        )}
      </Stack>
     </Stack>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}
