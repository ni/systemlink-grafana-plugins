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
      <InlineField label="Query type" labelWidth={14} tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={enumToOptions(SystemQueryType)}
          onChange={onQueryTypeChange}
          value={query.queryKind}
        />
      </InlineField>
      {query.queryKind === SystemQueryType.Metadata && (
        <InlineField label="System" labelWidth={14} tooltip={tooltips.system}>
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

const tooltips = {
  queryType: `Metadata allows you to visualize the properties of one or more systems.
              Summary allows you to visualize the number of disconnected and connected systems.`,
  system: `Query for a specific system by its name or ID. If left blank, the plugin returns all
            available systems. You can enter a variable into this field.`,
};
