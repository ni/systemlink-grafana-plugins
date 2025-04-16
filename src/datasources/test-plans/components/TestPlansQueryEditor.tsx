import React, { useCallback } from 'react';
import { AutoSizeInput, HorizontalGroup, RadioButtonGroup, VerticalGroup } from '@grafana/ui';
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

  const takeChange = (event: React.FormEvent<HTMLInputElement>) => {
      const value = (event.target as HTMLInputElement).value;
      handleQueryChange({ ...query, take: value });
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
        <InlineField label="Take" labelWidth={18}>
            <AutoSizeInput
              minWidth={20}
              maxWidth={40}
              defaultValue={query.take}
              onCommitChange={takeChange}
              placeholder="Enter record count"
            />
        </InlineField>
      </HorizontalGroup>
    </>
  );
}
