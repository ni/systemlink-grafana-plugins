import React, { useEffect } from 'react';
import { PartNumberQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import { PartNumberDataSource } from '../PartNumberDataSource';

type Props = QueryEditorProps<PartNumberDataSource, PartNumberQuery>;

export function PartNumberQueryEditor({ query, onChange, onRunQuery }: Props) {
  useEffect(() => {
    onChange(Object.assign({ init: true }, query));
    onRunQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span>This data source returns all SystemLink partnumber and does not include a query editor.</span>
  );
}
