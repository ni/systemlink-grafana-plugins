import React from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AssetDataSource } from '../AssetDataSource';
import {
  AssetQuery,
  AssetQueryLabel,
  AssetQueryType,
} from '../types';
import { Select } from '@grafana/ui';
import { QueryMetadataEditor } from './AssetQueryMetadataEditor';
import { QueryUtilizationEditor } from "./AssetQueryUtilizationEditor";
import { AssetQueryEditorCommon } from "./AssetQueryEditorCommon";

type Props = QueryEditorProps<AssetDataSource, AssetQuery>;

export function AssetQueryEditor(props: Props) {
  const common = new AssetQueryEditorCommon(props, () => {});

  const handleQueryTypeChange = (item: SelectableValue<AssetQueryType>): void => {
    common.handleQueryChange({ ...common.query, queryKind: item.value! }, true);
  };


  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
        <Select
          options={queryTypeOptions}
          onChange={handleQueryTypeChange}
          value={common.query.queryKind}
          width={85}/>
      </InlineField>
      {common.query.queryKind === AssetQueryType.Metadata &&
          <QueryMetadataEditor {...props}/>}
      {common.query.queryKind === AssetQueryType.Utilization &&
          <QueryUtilizationEditor {...props}/>}
    </div>
  );
}

const queryTypeOptions = [
  {
    label: AssetQueryLabel.Metadata,
    value: AssetQueryType.Metadata,
    description: 'Metadata allows you to visualize the properties of one or more assets.',
  },
  {
    label: AssetQueryLabel.Utilization,
    value: AssetQueryType.Utilization,
    description:
      'Utilization allows you to visualize the utilization of one or more assets.',
  },
];

const tooltips = {
  queryType: 'Select the type of query you want to run.',
};
