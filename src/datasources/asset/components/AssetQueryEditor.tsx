import React, { useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';

import _ from 'lodash';
import { ListAssetsQuery, AssetQuery, AssetQueryType, AssetSummaryQuery } from '../types';
import { InlineField, Select } from '@grafana/ui';
import { AssetDataSource } from '../AssetDataSource';
import { ListAssetsEditor } from './editors/list-assets/ListAssetsEditor';
import { AssetCalibrationQuery } from '../../asset-calibration/types';
import { CalibrationForecastEditor } from './editors/calibration-forecast/CalibrationForecastEditor';
import { AssetSummaryEditor } from './editors/asset-summary/AssetSummaryEditor';

type Props = QueryEditorProps<AssetDataSource, AssetQuery>;

export function AssetQueryEditor ( { query, onChange, onRunQuery, datasource }: Props ) {
  query = datasource.prepareQuery( query );
  const [ queryType, setQueryType ] = useState( AssetQueryType.ListAssets );

  const handleQueryChange = ( value: AssetQuery, runQuery = false ): void => {
    onChange( { ...query, ...value } );
    if ( runQuery ) {
      onRunQuery();
    }
  };
  
  const handleQueryTypeChange = ( item: SelectableValue<AssetQueryType> ): void => {
    const type = item.value! as AssetQueryType;
    if ( type === AssetQueryType.ListAssets ) {
      handleQueryChange( {...query, workspace: '', minionIds: []}, true );
    }
    if ( type === AssetQueryType.CalibrationForecast ) {
      handleQueryChange( { ...query } );
    }
    if ( type === AssetQueryType.AssetSummary ) {
      handleQueryChange( { ...query } );
    }
    setQueryType( type );
  };

  return (
    <div style={ { position: 'relative' } }>
        <InlineField label="Query type" labelWidth={22} tooltip={tooltips.queryType}>
          <Select
            options={queryTypeOptions}
            onChange={handleQueryTypeChange}
            value={queryType}
            width={85} />
      </InlineField>
      {
        queryType === AssetQueryType.ListAssets && (
          <ListAssetsEditor query={query as ListAssetsQuery} handleQueryChange={handleQueryChange} datasource={datasource} />
        )
      }
      {
        queryType === AssetQueryType.CalibrationForecast && (
          <CalibrationForecastEditor query={query as AssetCalibrationQuery} handleQueryChange={handleQueryChange} datasource={datasource} />
        )
      }
      {
        queryType === AssetQueryType.AssetSummary && (
          <AssetSummaryEditor query={query as AssetSummaryQuery} handleQueryChange={handleQueryChange} datasource={datasource} />
        )
      }
    </div>
  );
}

const queryTypeOptions = [
  {
    label: AssetQueryType.ListAssets,
    value: AssetQueryType.ListAssets,
    description: 'List assets allows you to search for assets based on various filters.',
  },
  {
    label: AssetQueryType.CalibrationForecast,
    value: AssetQueryType.CalibrationForecast,
    description:
      'Calibration forecast allows you visualize the upcoming asset calibrations in the configured timeframe.',
  },
  {
    label: AssetQueryType.AssetSummary,
    value: AssetQueryType.AssetSummary,
    description: 'Asset summary allows you to visualize the asset details in a tabular format.',
  }
];


const tooltips = {
  queryType: `Select the type of query you want to run.`,
};

