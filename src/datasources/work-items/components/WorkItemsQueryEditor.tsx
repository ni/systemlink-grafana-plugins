import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { 
  getTakeError, 
  isPropertiesNonEmpty, 
  isTypesNonEmpty, 
  stripCustomPropertySuffix 
} from '../utils';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import { User } from 'shared/types/QueryUsers.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [products, setProducts] = useState<ProductPartNumberAndName[] | null>(null);
  const [systemAliases, setSystemAliases] = useState<SystemAlias[] | null>(null);
  const [customPropertyOptions, setCustomPropertyOptions] = useState<Array<ComboboxOption<string>>>([]);
  const [isCustomPropertiesInitialized, setIsCustomPropertiesInitialized] = useState(false);

  const lastUsedFilter = useRef(query.filter);
  const lastCustomPropertiesParamsRef = useRef<{
    filter: string | undefined;
    take: number;
    orderBy: OrderByOptions | undefined;
    descending: boolean | undefined;
  } | null>(null);

  const selectedProperties = useMemo(
    () => query.properties ?? [], [query.properties]
  );
  const selectedCustomProperties = useMemo(
    () => query.customProperties ?? [], [query.customProperties]
  );

  const outputType = query.outputType ?? OutputType.Properties;
  const isPropertiesOutput = outputType === OutputType.Properties;
  const outputTypeOptions = Object.values(OutputType).map(value => ({
    label: value,
    value,
  }));

  const standardPropertiesOptions = useMemo(
    () =>
      Object.values(WorkItemProperties)
        .filter(property => property.value !== WorkItemPropertiesOptions.PROPERTIES)
        .map(property => ({
          label: property.label,
          value: property.value,
          group: property.group,
        })),
    []
  );

  const propertiesOptions = useMemo(
    () => [...standardPropertiesOptions, ...customPropertyOptions],
    [standardPropertiesOptions, customPropertyOptions]
  );

  const isPropertiesValid = isPropertiesNonEmpty(selectedProperties, selectedCustomProperties);
  const isTypesValid = isTypesNonEmpty(query.types);
  const takeInvalidMessage = getTakeError(query.take);
  const isTakeValid = takeInvalidMessage === '';
  const isQueryValid = isPropertiesOutput && isTypesValid && isTakeValid;

  const queryFilter = query.filter || undefined;
  const queryTake = query.take ?? DEFAULT_TAKE;

  const globalVariableOptions = useMemo(() => datasource.globalVariableOptions(), [datasource]);

  const customPropertiesFilter = datasource.buildFilterFromQuery(
    { ...query, filter: queryFilter }
  );

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
  }, [
    isCustomPropertiesInitialized, 
    customPropertyOptions, 
    selectedCustomProperties
  ]);

  const isPropertiesFieldInvalid = !isPropertiesValid || !!invalidCustomPropertiesMessage;
  const getPropertiesFieldError = useCallback(
    () => (isPropertiesValid ? invalidCustomPropertiesMessage : propertiesErrorMessages.atLeastOneRequired),
    [isPropertiesValid, invalidCustomPropertiesMessage]
  );

  const fetchAndSetLookupData = useCallback(async () => {
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

  const fetchAndSetCustomPropertyOptions = useCallback(
    async (
      filter: string | undefined,
      take: number,
      orderBy: OrderByOptions | undefined,
      descending: boolean | undefined
    ) => {
      try {
        const options = await datasource.getCustomPropertyOptions(
          filter,
          take,
          orderBy,
          descending
        );
        setCustomPropertyOptions(options.slice(0, CUSTOM_PROPERTY_OPTIONS_LIMIT));
        setIsCustomPropertiesInitialized(true);
      } catch {
        setCustomPropertyOptions([]);
        setIsCustomPropertiesInitialized(false);
      }
    },
    [datasource]
  );

  const typeOptions = useMemo(
    () => [...globalVariableOptions, ...WorkItemTypes] as Array<ComboboxOption<WorkItemTypeOptions>>,
    [globalVariableOptions]
  );

  const handleQueryChange = useCallback(
    (query: WorkItemsQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  useEffect(() => {
    fetchAndSetLookupData();
  }, [fetchAndSetLookupData]);

  useEffect(() => {
    if (!isQueryValid) {
      if (isPropertiesOutput && (!isTypesValid || !isTakeValid)) {
        lastCustomPropertiesParamsRef.current = null;
        setCustomPropertyOptions([]);
        setIsCustomPropertiesInitialized(false);
      }
      return;
    }

    const lastParams = lastCustomPropertiesParamsRef.current;
    const paramsUnchanged =
      lastParams !== null &&
      lastParams.filter === customPropertiesFilter &&
      lastParams.take === queryTake &&
      lastParams.orderBy === query.orderBy &&
      lastParams.descending === query.descending;

    if (paramsUnchanged) {
      return;
    }

    lastCustomPropertiesParamsRef.current = {
      filter: customPropertiesFilter,
      take: queryTake,
      orderBy: query.orderBy,
      descending: query.descending,
    };

    fetchAndSetCustomPropertyOptions(
      customPropertiesFilter,
      queryTake,
      query.orderBy,
      query.descending
    );
  }, [
    fetchAndSetCustomPropertyOptions,
    isQueryValid,
    isPropertiesOutput,
    isTypesValid,
    isTakeValid,
    customPropertiesFilter,
    queryTake,
    query.orderBy,
    query.descending
  ]);

  useEffect(() => {
    if (!query.outputType) {
      handleQueryChange({ ...query, outputType: OutputType.Properties });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const value = event.detail.linq;
    if (query.filter !== value && lastUsedFilter.current !== value) {
      lastUsedFilter.current = value;
      handleQueryChange({ ...query, filter: value });
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
          value={outputType}
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
          options={typeOptions}
          value={query.types}
          onChange={onTypesChange}
          enableAllOption
          width="auto"
          minWidth={CONTROL_WIDTH}
          maxWidth={CONTROL_WIDTH}
        />
      </InlineField>
      {outputType === OutputType.Properties && (
        <>
          <InlineField
            label={labels.properties}
            labelWidth={LABEL_WIDTH}
            tooltip={tooltips.properties}
            invalid={isPropertiesFieldInvalid}
            error={getPropertiesFieldError()}
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
        {outputType === OutputType.Properties && (
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
