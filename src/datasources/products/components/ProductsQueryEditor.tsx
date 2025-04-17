import React, { useEffect, useState, useCallback } from 'react';
import { AutoSizeInput, HorizontalGroup, InlineSwitch, MultiSelect, Select, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { ProductsDataSource } from '../ProductsDataSource';
import { OrderBy, ProductQuery, Properties } from '../types';
import { Workspace } from 'core/types';
import { ProductsQueryBuilder } from 'datasources/products/components/query-builder/ProductsQueryBuilder';
import { FloatingError } from 'core/errors';
import './ProductsQueryEditor.scss';
import { validateNumericInput } from 'core/utils';
import { ProductsQueryBuilder2 } from './query-builder/ProductsQueryBuilder2';

type Props = QueryEditorProps<ProductsDataSource, ProductQuery>;

export function ProductsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [familyNames, setFamilyNames] = useState<string[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [isQueryBuilderDisabled, setQueryBuilderState] = useState<boolean>(true);

  useEffect(() => {
    const loadWorkspaces = async () => {
      await datasource.areWorkspacesLoaded$;
      setWorkspaces(Array.from(datasource.workspacesCache.values()));
    };
    const loadPartNumbers = async () => {
      await datasource.arePartNumberLoaded$;
      setPartNumbers(Array.from(datasource.partNumbersCache.values()));
    };
    const loadFamilyNames = async () => {
      await datasource.getFamilyNames();
      setFamilyNames(Array.from(datasource.familyNamesCache.values()));
    };
    const loadProductNames = () => {
      const datasourceProductNames = datasource.getProductNames();
      setProductNames(datasourceProductNames);
    };
    const updateQueryBuilderState = () => {
      const isDisabled = datasource.queryBuilderDisabled;
      setQueryBuilderState(isDisabled);
    }

    loadWorkspaces();
    loadPartNumbers();
    loadFamilyNames();
    loadProductNames();
    updateQueryBuilderState();
  }, [datasource, datasource.productNames, datasource.queryBuilderDisabled]);

  const handleQueryChange = useCallback(
    (query: ProductQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
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

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
  };

  const onParameterChange = (value: string) => {
    if (query.queryBy !== value) {
      handleQueryChange({ ...query, queryBy: value });
    }
  };

  const onQueryByChange = (value: string) => {
    if (query.queryBy2 !== value) {
      handleQueryChange({ ...query, queryBy2: value });
    }
  }

  return (
    <>
      <HorizontalGroup align="flex-start">
        <VerticalGroup>
          <InlineField label="Properties" labelWidth={18} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder="Select properties to fetch"
              options={Object.keys(Properties).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties!}
              maxVisibleValues={5}
              noMultiValueWrap={true}
              width={65}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
          <InlineField label="Query By" labelWidth={18} tooltip={tooltips.queryBy}>
            <ProductsQueryBuilder
              filter={query.queryBy}
              workspaces={workspaces}
              partNumbers={partNumbers}
              familyNames={familyNames}
              globalVariableOptions={datasource.globalVariableOptions()}
              onChange={(event: any) => onParameterChange(event.detail.linq)}
            ></ProductsQueryBuilder>
          </InlineField>
          <InlineField label="Query Builder2" labelWidth={18} tooltip={tooltips.queryBy}>
            <ProductsQueryBuilder2
              filter={query.queryBy}
              productNames={productNames}
              queryBuilderDisabled={isQueryBuilderDisabled}
              globalVariableOptions={datasource.globalVariableOptions()}
              onChange={(event: any) => onQueryByChange(event.detail.linq)}
            ></ProductsQueryBuilder2>
          </InlineField>
        </VerticalGroup>
        <VerticalGroup>
          <div className="right-query-controls">
            <div className="horizontal-control-group">
              <InlineField label="OrderBy" labelWidth={18} tooltip={tooltips.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  placeholder="Select field to order by"
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={query.orderBy}
                  width={26}
                />
              </InlineField>
              <InlineField label="Descending" tooltip={tooltips.descending}>
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            </div>
            <InlineField label="Take" labelWidth={18} tooltip={tooltips.recordCount}>
              <AutoSizeInput
                minWidth={26}
                maxWidth={26}
                type="number"
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
                placeholder="Enter record count"
                onKeyDown={event => {
                  validateNumericInput(event);
                }}
              />
            </InlineField>
          </div>
        </VerticalGroup>
      </HorizontalGroup>
      <FloatingError message={datasource.error} />
    </>
  );
}

const tooltips = {
  properties: 'Specifies the properties to be queried.',
  recordCount: 'Specifies the maximum number of products to return.',
  orderBy: 'Specifies the field to order the queried products by.',
  descending: 'Specifies whether to return the products in descending order.',
  queryBy: 'Specifies the filter to be applied on the queried products. This is an optional field.',
};
