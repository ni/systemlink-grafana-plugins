import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { TestPlansQuery } from '../types';

type Props = QueryEditorProps<TestPlansDataSource, TestPlansQuery>;

export function TestPlansQueryEditor({ query, onChange, onRunQuery }: Props) {
  return (
    <>
    </>
  );
}
