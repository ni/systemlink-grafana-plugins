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
  CUSTOM_PROPERTY_OPTIONS_LIMIT, 
  CUSTOM_PROPERTY_SUFFIX, DEFAULT_TAKE 
} from '../constants';
import {
  OrderByOptions,
  OutputType,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from '../types';
import { getTakeError, isPropertiesNonEmpty, isTypesNonEmpty, stripCustomPropertySuffix } from '../utils';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import { User } from 'shared/types/QueryUsers.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const selectedProperties = useMemo(
    () => query.properties ?? [], [query.properties]
  );
  const selectedCustomProperties = useMemo(
    () => query.customProperties ?? [], [query.customProperties]
  );

  const isPropertiesValid = isPropertiesNonEmpty(selectedProperties, selectedCustomProperties);
  const isTypesValid = isTypesNonEmpty(query.types);
  const takeInvalidMessage = getTakeError(query.take);
  const isTakeValid = takeInvalidMessage === '';

  const [customPropertyOptions, setCustomPropertyOptions] = useState<Array<ComboboxOption<string>>>([]);
  const [isCustomPropertiesInitialized, setIsCustomPropertiesInitialized] = useState(false);

  // The custom properties bag is expanded into one option per key, so the single
  // catch-all `PROPERTIES` option is not offered in the dropdown.
  const standardPropertiesOptions = useMemo(
    () =>
      Object.values(WorkItemProperties)
        .filter(property => property.value !== WorkItemPropertiesOptions.PROPERTIES)
        .map(property => ({
          label: property.label,
          value: property.value as string,
          group: property.group as string,
        })),
    []
  );

  const propertiesOptions = useMemo(
    () => [...standardPropertiesOptions, ...customPropertyOptions],
    [standardPropertiesOptions, customPropertyOptions]
  );

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

  const isPropertiesOutput = query.outputType === OutputType.Properties;
  // The query builder emits '' for an empty filter while the saved query stores undefined;
  // normalizing keeps the effect dependency stable so it does not refetch on every emit.
  const queryFilter = query.filter || undefined;
  const queryTake = query.take ?? DEFAULT_TAKE;

  useEffect(() => {
    if (!isPropertiesOutput) {
      return;
    }

    let isStale = false;
    const loadCustomProperties = async () => {
      try {
        const options = await datasource.getCustomPropertyOptions(queryFilter, queryTake);
        if (!isStale) {
          setCustomPropertyOptions(options.slice(0, CUSTOM_PROPERTY_OPTIONS_LIMIT));
        }
      } catch {
        if (!isStale) {
          setCustomPropertyOptions([]);
        }
      } finally {
        if (!isStale) {
          setIsCustomPropertiesInitialized(true);
        }
      }
    };

    loadCustomProperties();

    return () => {
      isStale = true;
    };
  }, [datasource, isPropertiesOutput, queryFilter, queryTake]);

  const selectedPropertyOptions = useMemo(() => {
    const optionsByValue = new Map(
      propertiesOptions.map(option => [option.value, option])
    );
    const selectedValues = [
      ...selectedProperties,
      ...selectedCustomProperties.map(
        customProperty => `${customProperty}${CUSTOM_PROPERTY_SUFFIX}`
      ),
    ];

    return selectedValues.map(
      value => optionsByValue.get(value) ?? { 
        label: stripCustomPropertySuffix(value), value 
      }
    );
  }, [propertiesOptions, 
    selectedProperties, 
    selectedCustomProperties
  ]);

  const invalidCustomPropertiesMessage = useMemo(() => {
    if (!isCustomPropertiesInitialized) {
      return '';
    }

    const availableCustomProperties = new Set(
      customPropertyOptions.map(
        option => stripCustomPropertySuffix(option.value)
      )
    );
    const invalidCustomProperties = selectedCustomProperties.filter(
      customProperty => !availableCustomProperties.has(customProperty)
    );

    if (invalidCustomProperties.length === 0) {
      return '';
    }

    const formattedInvalidCustomProperties = invalidCustomProperties.join(', ');
    return invalidCustomProperties.length === 1
      ? `The following selected custom property is not valid: '${formattedInvalidCustomProperties}'`
      : `The following selected custom properties are not valid: '${formattedInvalidCustomProperties}'`;
  }, [isCustomPropertiesInitialized, customPropertyOptions, selectedCustomProperties]);

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

  const onPropertiesChange = (items: Array<ComboboxOption<string>>) => {
    const selectedValues = items.map(item => item.value).filter(Boolean);
    const properties = selectedValues.filter(
      value => !value.endsWith(CUSTOM_PROPERTY_SUFFIX)
    ) as WorkItemPropertiesOptions[];
    const customProperties = selectedValues
      .filter(value => value.endsWith(CUSTOM_PROPERTY_SUFFIX))
      .map(stripCustomPropertySuffix);

    handleQueryChange(
      { ...query, properties, customProperties },
      isPropertiesNonEmpty(properties, customProperties)
    );
  };

  const onFilterChange = (event: any) => {
    const filter = event.detail.linq || undefined;
    if (queryFilter !== filter) {
      handleQueryChange({ ...query, filter });
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
            invalid={!isPropertiesValid || !!invalidCustomPropertiesMessage}
            error={
              isPropertiesValid ? invalidCustomPropertiesMessage : propertiesErrorMessages.atLeastOneRequired
            }
          >
            <MultiCombobox
              placeholder={placeholders.properties}
              options={propertiesOptions}
              value={selectedPropertyOptions}
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
            onChange={onFilterChange}
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
