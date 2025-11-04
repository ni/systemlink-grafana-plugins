import React, { useRef } from 'react';
import { DataFrameFeatureToggles, DataFrameFeatureTogglesDefaults, Props, PropsV1 } from '../types';
import { DataFrameVariableQueryEditorV1 } from './v1/DataFrameVariableQueryEditorV1';
import { DataFrameVariableQueryEditorV2 } from './v2/DataFrameVariableQueryEditorV2';

export const DataFrameVariableQueryEditorWrapper = (props: Props) => {
  const dataFrameFeatures = useRef<DataFrameFeatureToggles>({
    queryByDataTableProperties: props.datasource.instanceSettings.jsonData?.featureToggles?.queryByDataTableProperties
      ?? DataFrameFeatureTogglesDefaults.queryByDataTableProperties
  });

  return (
    dataFrameFeatures.current.queryByDataTableProperties
      ? <DataFrameVariableQueryEditorV2 {...props as any} />
      : <DataFrameVariableQueryEditorV1 {...props as PropsV1} />
  )
}
