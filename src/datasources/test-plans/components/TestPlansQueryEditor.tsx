import React, { useCallback } from 'react';
import { HorizontalGroup, RadioButtonGroup, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { OutputType, TestPlansQuery } from '../types';
import { ProductsQueryBuilder } from './query-builder/TestPlansQueryBuilder';

type Props = QueryEditorProps<TestPlansDataSource, TestPlansQuery>;

export function TestPlansQueryEditor ({ query, onChange, onRunQuery, datasource }: Props) {
  const handleQueryChange = useCallback((query: TestPlansQuery, runQuery = true): void => {
    onChange(query);
    if (runQuery) {
      onRunQuery();
    }
  }, [ onChange, onRunQuery ]);

  const onParameterChange = (value: string) => {
    if (query.queryBy !== value) {
      handleQueryChange({ ...query, queryBy: value });
    }
  };

  const onOutputChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  return (
    <>
      <HorizontalGroup align="flex-start">
        <VerticalGroup>
          <InlineField label="Output" labelWidth={ 18 }>
            <RadioButtonGroup
              options={ Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[] }
              value={ query.outputType }
              onChange={ onOutputChange }
            />
          </InlineField>
          <InlineField label="Query By" labelWidth={ 18 }>
            <ProductsQueryBuilder
              filter={ query.queryBy }
              globalVariableOptions={ datasource.globalVariableOptions() }
              onChange={ (event: any) => onParameterChange(event.detail.linq) }
            ></ProductsQueryBuilder>
          </InlineField>
        </VerticalGroup>
      </HorizontalGroup>
    </>
  );
}
