import React, { useEffect } from 'react';
import { AsyncSelect, LoadOptionsCallback, RadioButtonGroup, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { TestInsightDataSource } from '../TestInsightDataSource';
import { ProductQueryOutput, TestInsightQuery, TestInsightQueryType } from '../types';
import { enumToOptions } from 'core/utils';
import { isValidId } from 'datasources/data-frame/utils';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
import { TestResultsQueryBuilder } from '../ResultsQueryBuilder';

type Props = QueryEditorProps<TestInsightDataSource, TestInsightQuery>;

export function TestInsightQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  // const workspaces = useWorkspaceOptions(datasource);

  useEffect(() => {
    if (query.type === TestInsightQueryType.Summary) {
      onChange(query);
      onRunQuery();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const onQueryTypeChange = (value: TestInsightQueryType) => {
    onChange({...query, type: value });
    onRunQuery();
  };

  // const onWorkspaceChange = (option?: SelectableValue<string>) => {
  //   onChange({ ...query, workspace: option?.value ?? '' });
  //   onRunQuery();
  // };

  // const onFamilyNameChange = (value: TestInsightQuery) => {
  //   onChange(value);
  //   onRunQuery();
  // }

  // const onPartNumberChange = (event: FormEvent<HTMLInputElement>) => {
  //   onChange({ ...query, partNumber: event.currentTarget.value });
  //   onRunQuery();
  // }

  const onResultsParameterChange = (value: string) => {
    onChange({ ...query, resultParameters: value });
    onRunQuery();
  };

  
  const onProductsParameterChange = (value: string) => {
    onChange({ ...query, productParameters: value });
    onRunQuery();
  };

  const onSelectionChange = (value: SelectableValue<ProductQueryOutput>) => {
    if (value.value !== undefined) {
      onChange({ ...query, output: value.value });
      onRunQuery();
    }
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
          options={enumToOptions(TestInsightQueryType)}
          value={query.type}
          onChange={onQueryTypeChange}
        />
      </InlineField>
      { (query.type === TestInsightQueryType.Summary) && (
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
          { query.type === TestInsightQueryType.Summary && (
        <>
        <InlineField label="Output">
            <Select options={Object.values(ProductQueryOutput).map(value => ({ label: value, value }))} onChange={onSelectionChange} value={query.output} />
          </InlineField>

        </>
      )}
          {/* <InlineField label="Part Number" labelWidth={14}>
       <AutoSizeInput
          defaultValue={query.partNumber}
           maxWidth={80}
           minWidth={20}
           placeholder="Part number"
           onCommitChange={onPartNumberChange}
         />
          </InlineField> */}
          {/* <InlineField label="Workspace" labelWidth={14}>
        <Select
          isClearable
          isLoading={workspaces.loading}
          onChange={onWorkspaceChange}
          options={workspaces.value}
          placeholder="Any workspace"
          value={query.workspace}
        />
          </InlineField> */}
      </>
      )}
      { query.type === TestInsightQueryType.Products && (
        <>
            <TestResultsQueryBuilder 
              onChange={(event: any) => onProductsParameterChange(event.detail.linq) }
              queryType={query.type}
              defaultValue={query.productParameters}/>
        </>
      )}
      { query.type === TestInsightQueryType.Results && (
        <>
            <TestResultsQueryBuilder 
              onChange={(event: any) => onResultsParameterChange(event.detail.linq) }
              queryType={query.type}
              defaultValue={query.resultParameters}/>
        </>
      )}
      
     </>
 )};
 
