import React from 'react';
import { Props } from '../types';
import { DataFrameQueryEditorV2 } from './v2/DataFrameQueryEditorV2';

export const DataFrameQueryEditorWrapper = (props: Props) => {
  return (
    <DataFrameQueryEditorV2 {...props} />
  );
};
