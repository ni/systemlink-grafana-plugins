import React, { useRef } from 'react';
import { DataFrameFeatureToggles, DataFrameFeatureTogglesDefaults, Props } from '../types';
import { DataFrameQueryEditorV2 } from './v2/DataFrameQueryEditorV2';
import { DataFrameQueryEditorV1 } from './v1/DataFrameQueryEditorV1';

export const DataFrameQueryEditorWrapper = (props: Props) => {
  const dataFrameFeatures = useRef<DataFrameFeatureToggles>({
    queryByDataTableProperties: props.datasource.instanceSettings.jsonData?.featureToggles?.queryByDataTableProperties
      ?? DataFrameFeatureTogglesDefaults.queryByDataTableProperties
  });

  return (
    dataFrameFeatures.current.queryByDataTableProperties
      ? <DataFrameQueryEditorV2 />
      : <DataFrameQueryEditorV1 {...props} />
  );
};
