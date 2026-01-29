import React from 'react';
import { Props } from '../types';
import { DataFrameVariableQueryEditorV2 } from './v2/DataFrameVariableQueryEditorV2';

export const DataFrameVariableQueryEditorWrapper = (props: Props) => {
  return (
    <DataFrameVariableQueryEditorV2 {...props} />
  );
};
