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
import { ProductsQueryBuilderStaticFields } from '../constants/ProductsQueryBuilder.constants';


type Props = QueryEditorProps<ProductsDataSource, ProductQuery>;

export function ProductsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      await datasource.areWorkspacesLoaded$;
      setWorkspaces(Array.from(datasource.workspacesCache.values()));
    };
    const loadPartNumbers = async () => {
      await datasource.arePartNumberLoaded$;
      setPartNumbers(Array.from(datasource.partNumbersCache.values()));
    };

    loadWorkspaces();
    loadPartNumbers();
  }, [datasource]);

  const handleQueryChange = useCallback((query: ProductQuery, runQuery = true): void => {
    onChange(query);
    if (runQuery) {
      onRunQuery();
    }
  }, [onChange, onRunQuery]);

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as Properties) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  }

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  }

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
  }

  const onParameterChange = (value: string) => {
    if (query.queryBy !== value) {
      handleQueryChange({ ...query, queryBy: value });
    }
  }

  return (
    <>
      <HorizontalGroup align="flex-start">
        <VerticalGroup>
          <InlineField label="Properties" labelWidth={18} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder="Select properties to fetch"
              options={Object.keys(Properties)
                .map(value => ({ label: value, value })) as SelectableValue[]}
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
              globalVariableOptions={datasource.globalVariableOptions()}
              onChange={(event: any) => onParameterChange(event.detail.linq)}
              staticFields={ProductsQueryBuilderStaticFields}
            ></ProductsQueryBuilder>
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
                minWidth={20}
                maxWidth={40}
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
                placeholder="Enter record count"
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
  properties: "Select the properties fields to query",
  recordCount: "Enter the number of records to query",
  orderBy: "Select the field to order the results by",
  descending: "Select to order the results in descending order",
  queryBy: 'Enter the query to filter the results',
}
