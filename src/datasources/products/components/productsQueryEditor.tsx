import React from 'react';
import { AsyncSelect, InlineLabel, LoadOptionsCallback, RadioButtonGroup, Select } from '@grafana/ui';
import { QueryEditorProps, QueryVariableModel, SelectableValue, toOption } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { productsDataSource } from '../productsDataSource';
import { enumToOptions } from 'core/utils';
import { ProductsQuery, ProductsQueryType, ProductQueryOutput } from '../types';
import { isValidId } from '../utils';
import { getTemplateSrv } from '@grafana/runtime';
import _ from 'lodash';
import { TestResultsQueryBuilder } from '../QueryBuilder';

type Props = QueryEditorProps<productsDataSource, ProductsQuery>;

export function productsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const onQueryTypeChange = (value: ProductsQueryType) => {
    onChange({...query, type: value });
    onRunQuery();
  };

  const onSelectionChange = (value: SelectableValue<ProductQueryOutput>) => {
    if (value.value !== undefined) {
      onChange({ ...query, output: value.value });
      onRunQuery();
    }
  };

  const onProductsParameterChange = (value: string) => {
    const matchingVariables = getTemplateSrv().getVariables().filter(variable => value.includes(variable.name)) as QueryVariableModel[];
    const variableDictionary: Record<string, string> = {};
    matchingVariables.forEach(variable => {
      variableDictionary[variable.name] = variable.current.value as string;
    });
   value = value.replace(/\$[a-zA-Z0-9_]+/g, (match) => variableDictionary[match.slice(1)]);
  
    onChange({ ...query, productFilter: value});
    onRunQuery();
  };

  const handleLoadPartNumberOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
    if (!query || query.startsWith('$')) {
      return cb?.(getVariableOptions());
    }

    loadPartNumberOptions(query, cb);

  };

  const getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => toOption('$' + v.name));
  };

  const handlePartNumberChange = (item: SelectableValue<string>) => {
    if (query.partNumber !== item.value) {
      onChange({ ...query, partNumber: item.value!});
      onRunQuery();
    }
  };

  const loadPartNumberOptions = _.debounce((query: string, cb?: LoadOptionsCallback<string>) => {
    Promise.all([datasource.queryProducts(`partNumber.Contains(\"${query}\")` , false)])
      .then(([partNumber]) =>
      cb?.(
        partNumber.products.map(t => ({
          label: t.partNumber,
          value: t.partNumber,
          title: t.partNumber,
        }))
      )
    )
  }, 300);
  
  return (
    <>
      <InlineField label="Query type">
        <RadioButtonGroup
          options={enumToOptions(ProductsQueryType)}
          value={query.type}
          onChange={onQueryTypeChange}
        />
      </InlineField>
      {(query.type === ProductsQueryType.Summary) && (
        <>
          <InlineField label="PartNumber" labelWidth={14}>
            <AsyncSelect
              allowCreateWhileLoading
              allowCustomValue
              cacheOptions={false}
              defaultOptions
              isValidNewOption={isValidId}
              loadOptions={handleLoadPartNumberOptions}
              onChange={handlePartNumberChange}
              placeholder="Part Number"
              width={30}
              value={query.partNumber ? toOption(query.partNumber) : null}
          />
          </InlineField>
          {query.type === ProductsQueryType.Summary && (
        <>
          <InlineField label="Output">
            <Select options={Object.values(ProductQueryOutput).map(value => ({ label: value, value }))} onChange={onSelectionChange} value={query.output} />
          </InlineField>
        </>
      )}
      </>
      )}
      { query.type === ProductsQueryType.Products && (
        <>
          <InlineLabel width={15}>Configure Query</InlineLabel>
          <TestResultsQueryBuilder
            autoComplete={datasource.queryProductValues.bind(datasource)}
            onChange={(event: any) => onProductsParameterChange(event.detail.linq) }
            queryType={query.type}
            defaultValue={query.productFilter}/>
        </>
      )}
    </>
  );
}
