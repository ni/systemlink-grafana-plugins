import React, { useRef } from 'react';
import { DataFrameFeatureToggles, DataFrameFeatureTogglesDefaults, PropsV1 } from '../types';
import { DataFrameVariableQueryEditorV1 } from './v1/DataFrameVariableQueryEditorV1';
import { DataFrameVariableQueryEditorV2 } from './v2/DataFrameVariableQueryEditorV2';

export const DataFrameVariableQueryEditorWrapper = (props: PropsV1) => {
  const dataFrameFeatures = useRef<DataFrameFeatureToggles>({
    queryByDataTableProperties: props.datasource.instanceSettings.jsonData?.featureToggles?.queryByDataTableProperties
      ?? DataFrameFeatureTogglesDefaults.queryByDataTableProperties
  });

  return (
    dataFrameFeatures.current.queryByDataTableProperties
      ? <DataFrameVariableQueryEditorV2 />
      : <DataFrameVariableQueryEditorV1 {...props} />
  )
}
