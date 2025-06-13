import React, { useEffect, useState, useCallback } from 'react';
import { AutoSizeInput, HorizontalGroup, InlineSwitch, MultiSelect, Select, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { ProductsDataSource } from '../ProductsDataSource';
import { OrderBy, ProductPropertiesProjectionMap, ProductQuery, Properties } from '../types';
import { Workspace } from 'core/types';
import { ProductsQueryBuilder } from 'datasources/products/components/query-builder/ProductsQueryBuilder';
import { FloatingError } from 'core/errors';
import './ProductsQueryEditor.scss';
import { validateNumericInput } from 'core/utils';
import { recordCountErrorMessages, TAKE_LIMIT } from '../constants/ProductsQueryEditor.constants';

type Props = QueryEditorProps<ProductsDataSource, ProductQuery>;

export function ProductsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [familyNames, setFamilyNames] = useState<string[]>([]);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  const [isPropertiesValid, setIsPropertiesValid] = useState<boolean>(true);
  
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

    loadWorkspaces();
    loadPartNumbers();
    loadFamilyNames();
  }, [datasource]);

  const handleQueryChange = useCallback((query: ProductQuery, runQuery = true): void => {
    onChange(query);
    if (runQuery) {
      onRunQuery();
    }
  }, [onChange, onRunQuery]);

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    setIsPropertiesValid(items.length > 0);
    if (items !== undefined ) {
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
    if (isRecordCountValid(value, TAKE_LIMIT)) {
      handleQueryChange({ ...query, recordCount: value });
    }
  }

  function isRecordCountValid(value: number, takeLimit: number): boolean {
    if (Number.isNaN(value) || value < 0) {
      setRecordCountInvalidMessage(recordCountErrorMessages.greaterOrEqualToZero);
      return false;
    }
    if (value > takeLimit) {
      setRecordCountInvalidMessage(recordCountErrorMessages.lessOrEqualToTakeLimit);
      return false;
    }
    setRecordCountInvalidMessage('');
    return true;
  }

  const onParameterChange = (value: string) => {
   if (query.queryBy !== value) {
      query.queryBy = value;
      handleQueryChange({ ...query, queryBy: value });
    }
  }

  return (
    <>
      <HorizontalGroup align="flex-start">
        <VerticalGroup>
          <InlineField 
            label="Properties"
            labelWidth={18}
            tooltip={tooltips.properties}
            invalid={!isPropertiesValid}
            error='You must select at least one property.'>
            <MultiSelect
              placeholder="Select properties to fetch"
              options={Object.keys(ProductPropertiesProjectionMap)
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
              familyNames={familyNames}
              globalVariableOptions={datasource.globalVariableOptions()}
              onChange={(event: any) => onParameterChange(event.detail.linq)}
            ></ProductsQueryBuilder>
          </InlineField>
        </VerticalGroup>
        <VerticalGroup>
          <div className="right-query-controls">
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
            <InlineField label="Descending" labelWidth={18} tooltip={tooltips.descending}>
              <InlineSwitch
                onChange={event => onDescendingChange(event.currentTarget.checked)}
                value={query.descending}
              />
            </InlineField>
            <InlineField 
                label="Take" 
                labelWidth={18} 
                tooltip={tooltips.recordCount} 
                invalid={!!recordCountInvalidMessage}
                error={recordCountInvalidMessage}>
              <AutoSizeInput
                minWidth={26}
                maxWidth={26}
                type='number'
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
                placeholder="Enter record count"
                onKeyDown={(event) => {validateNumericInput(event)}}
              />
            </InlineField>
          </div>
        </VerticalGroup>
      </HorizontalGroup>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}

const tooltips = {
  properties: "Specifies the properties to be queried.",
  recordCount: "Specifies the maximum number of products to return.",
  orderBy: "Specifies the field to order the queried products by.",
  descending: "Specifies whether to return the products in descending order.",
  queryBy: 'Specifies the filter to be applied on the queried products. This is an optional field.',
}
