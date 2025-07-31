import React, { useEffect, useMemo, useState } from 'react';
import { useAsync, useLocation } from 'react-use';
import { SelectableValue, toOption } from '@grafana/data';
import { InlineField, InlineSwitch, MultiSelect, Select, AsyncSelect, RadioButtonGroup } from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv, locationService } from '@grafana/runtime';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import { enumToOptions } from 'core/utils';
import { DataFrameQueryType } from '../types';

export const DataFrameQueryEditor = (props: Props) => {
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = useMemo(
    () => new DataFrameQueryEditorCommon(props, handleError)
    , [props]
  );
  const tableProperties = useAsync(() => common.datasource.getTableProperties(common.query.tableId).catch(handleError), [common.query.tableId]);

  const handleColumnChange = (items: Array<SelectableValue<string>>) => {
    common.handleQueryChange({ ...common.query, columns: items.map(i => i.value!) }, false);
  };

  const loadColumnOptions = () => {
    const columnOptions = (tableProperties.value?.columns ?? []).map(c => toOption(c.name));
    columnOptions.unshift(...getVariableOptions());
    return columnOptions;
  }

  // When the user toggles the "Fetch high resolution data on zoom" switch, we update the URL query parameters
  const updateFetchHighResolutionDataStateInQueryParams = (fetchHighResolutionData: boolean) => {
    const editPanelId = getPanelId();
    let fetchHighResolutionDataEnabledPanelIds: string[] = getEnabledPanelIds();

    if (fetchHighResolutionData && !fetchHighResolutionDataEnabledPanelIds.includes(editPanelId)) {
      fetchHighResolutionDataEnabledPanelIds.push(editPanelId);
    }

    if (!fetchHighResolutionData && fetchHighResolutionDataEnabledPanelIds.includes(editPanelId)) {
      fetchHighResolutionDataEnabledPanelIds = fetchHighResolutionDataEnabledPanelIds.filter((panelId) => panelId !== editPanelId);
    }

    locationService.partial({
      [`fetchHighResolutionData`]: fetchHighResolutionDataEnabledPanelIds.join(','),
    }, true);
  }

  // When URL query parameters change, we check if the current panel is enabled for fetching high resolution data and update the state in all the queries available in that panel - To sync the state across queries.
  const location = useLocation();
  useEffect(() => {
    const editPanelId = getPanelId();
    const fetchHighResolutionDataEnabledPanelIds: string[] = getEnabledPanelIds();

    const updatedFetchHighResolutionDataState = fetchHighResolutionDataEnabledPanelIds.includes(editPanelId ?? '');
    if (updatedFetchHighResolutionDataState !== common.query.fetchHighResolutionData) {
      common.handleQueryChange({ ...common.query, fetchHighResolutionData: updatedFetchHighResolutionDataState }, true);
    }
  }, [location.search, common]);

  // Utility functions
  const getEnabledPanelIds = (): string[] => {
    const queryParams = locationService.getSearchObject();
    const fetchHighResolutionDataOnZoom = queryParams['fetchHighResolutionData'];
    let enabledPanelIds: string[] = [];

    if (
      fetchHighResolutionDataOnZoom !== undefined
      && typeof fetchHighResolutionDataOnZoom === 'string'
      && fetchHighResolutionDataOnZoom !== ''
    ) {
      enabledPanelIds = fetchHighResolutionDataOnZoom.split(',');
    }

    return enabledPanelIds;
  }

  const getPanelId = (): string => {
    const queryParams = locationService.getSearchObject();
    const editPanelId = queryParams['editPanel'];

    if (
      editPanelId !== undefined
      && (typeof editPanelId === 'string' || typeof editPanelId === 'number')
      && editPanelId !== ''
    ) {
      return editPanelId.toString();
    }
    return '';
  }


  return (
    <div style={{ position: 'relative' }}>
      <InlineField label="Query type" tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={enumToOptions(DataFrameQueryType)}
          value={common.query.type}
          onChange={value => common.handleQueryChange({ ...common.query, type: value }, true)}
        />
      </InlineField>
      <InlineField label="Id">
        <AsyncSelect
          allowCreateWhileLoading
          allowCustomValue
          cacheOptions={false}
          defaultOptions
          isValidNewOption={isValidId}
          loadOptions={common.handleLoadOptions}
          onChange={common.handleIdChange}
          placeholder="Search by name or enter id"
          width={30}
          value={common.query.tableId ? toOption(common.query.tableId) : null}
        />
      </InlineField>
      {common.query.type === DataFrameQueryType.Data && (
        <>
          <InlineField label="Columns" shrink={true} tooltip={tooltips.columns}>
            <MultiSelect
              isLoading={tableProperties.loading}
              options={loadColumnOptions()}
              onChange={handleColumnChange}
              onBlur={common.onRunQuery}
              value={common.query.columns.map(toOption)}
            />
          </InlineField>
          <InlineField label="Decimation" tooltip={tooltips.decimation}>
            <Select
              options={decimationMethods}
              onChange={item => common.handleQueryChange({ ...common.query, decimationMethod: item.value! }, true)}
              value={common.query.decimationMethod}
            />
          </InlineField>
          <InlineField label="Filter nulls" tooltip={tooltips.filterNulls}>
            <InlineSwitch
              value={common.query.filterNulls}
              onChange={event => common.handleQueryChange({ ...common.query, filterNulls: event.currentTarget.checked }, true)}
            ></InlineSwitch>
          </InlineField>
          <InlineField label="Fetch high resolution data on zoom" tooltip={tooltips.useTimeRange}>
            <InlineSwitch
              value={common.query.fetchHighResolutionData}
              onChange={event => updateFetchHighResolutionDataStateInQueryParams(event.currentTarget.checked)}
            ></InlineSwitch>
          </InlineField>
        </>
      )}
      <FloatingError message={errorMsg}/>
    </div>
  );
};

const getVariableOptions = () => {
  return getTemplateSrv()
    .getVariables()
    .map(v => toOption('$' + v.name));
};

const tooltips = {
  queryType: `Specifies whether to visualize the data rows or properties associated with a table.`,

  columns: `Specifies the columns to include in the response data.`,

  decimation: `Specifies the method used to decimate the data.`,

  filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,

  useTimeRange: `Specifies whether to query only for data within the dashboard time range if the
                table index is a timestamp. Enable when interacting with your data on a graph.`,
};
