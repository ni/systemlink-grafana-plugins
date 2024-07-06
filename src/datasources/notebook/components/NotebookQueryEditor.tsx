import React from 'react';
import { AsyncSelect } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { NotebookDataSource } from '../NotebookDataSource';
import { NotebookQuery } from '../types';

type Props = QueryEditorProps<NotebookDataSource, NotebookQuery>;

export function NotebookQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  // const notebook = useAsync(() => 1, [query.notebookId]);
  // async function loadNotebookOptions(search: string, cb?: LoadOptionsCallback<string>): Promise<SelectableValue<string>[]> {
  //   console.log('loadNotebookOptions', search);
  //   return [];
  // }

  //datasource.getNotebookOptions('');

  return (
    <>
      <InlineField label="Notebook">
        <AsyncSelect
          defaultOptions
          loadOptions={datasource.getNotebookOptions.bind(datasource)}
          onChange={console.log}
          placeholder="Select a notebook"
          // value={query.id}
        />
      </InlineField>
    </>
  );
}
