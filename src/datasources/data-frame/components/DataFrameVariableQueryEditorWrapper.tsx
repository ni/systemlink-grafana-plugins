import React, { useRef } from 'react';
import { DataFrameFeatureToggles, DataFrameFeatureTogglesDefaults, Props } from '../types';
import { DataFrameVariableQueryEditorV1 } from './v1/DataFrameVariableQueryEditorV1';
import { DataFrameVariableQueryEditorV2 } from './v2/DataFrameVariableQueryEditorV2';

export const DataFrameVariableQueryEditorWrapper = (props: Props) => {
  const dataFrameFeatures = useRef<Partial<DataFrameFeatureToggles>>({
    queryByDataTableProperties: props.datasource.instanceSettings.jsonData?.featureToggles?.queryByDataTableProperties
      ?? DataFrameFeatureTogglesDefaults.queryByDataTableProperties
  });

  return (
    dataFrameFeatures.current.queryByDataTableProperties
      ? <DataFrameVariableQueryEditorV2 {...props} />
      : <DataFrameVariableQueryEditorV1 {...props} />
  );
};
