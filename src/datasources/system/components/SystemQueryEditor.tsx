import React, { FormEvent } from 'react';
import { AutoSizeInput, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { SystemDataSource } from '../SystemDataSource';
import { SystemQueryType, SystemQuery } from '../types';
import { enumToOptions } from 'core/utils';
import { InlineField } from 'core/components/InlineField';

type Props = QueryEditorProps<SystemDataSource, SystemQuery>;

export function SystemQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const onQueryTypeChange = (value: SystemQueryType) => {
    onChange({ ...query, queryKind: value });
    onRunQuery();
  };

  const onSystemChange = (event: FormEvent<HTMLInputElement>) => {
    onChange({ ...query, systemName: event.currentTarget.value });
    onRunQuery();
  };

  return (
    <>
      <InlineField label="Query type">
        <RadioButtonGroup
          options={enumToOptions(SystemQueryType)}
          onChange={onQueryTypeChange}
          value={query.queryKind}
        />
      </InlineField>
      {query.queryKind === SystemQueryType.Metadata && (
        <InlineField label="System" tooltip="Enter system ID or alias">
          <AutoSizeInput
            defaultValue={query.systemName}
            maxWidth={80}
            minWidth={20}
            onCommitChange={onSystemChange}
            placeholder="All systems"
          />
        </InlineField>
      )}
    </>
  );
}
