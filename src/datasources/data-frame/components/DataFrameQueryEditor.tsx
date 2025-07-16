import React, { useEffect, useState } from 'react';
import { useAsync } from 'react-use';
import { SelectableValue, toOption } from '@grafana/data';
import {
  InlineField,
  InlineSwitch,
  MultiSelect,
  Select,
  RadioButtonGroup,
  HorizontalGroup,
  VerticalGroup,
  AutoSizeInput,
} from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
// import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import { enumToOptions, validateNumericInput } from 'core/utils';
import { DataFrameQueryType } from '../types';
import { DataframeQueryBuilder } from './DataframeQuerybuilder';
import { Workspace } from 'core/types';
import { ResultsQueryBuilder } from 'datasources/results/components/query-builders/query-results/ResultsQueryBuilder';
import { TestMeasurementStatus } from 'datasources/results/types/types';

export const DataFrameQueryEditor = (props: Props) => {
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const [isDataTablesFilterValid, setDataTablesFilterValid] = useState<boolean>(false);
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new DataFrameQueryEditorCommon(props, handleError);
  const tableProperties = useAsync(
    () => common.datasource.getTableProperties(common.query.tableId).catch(handleError),
    [common.query.tableId]
  );

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await common.datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };
    const loadPartNumbers = async () => {
      const partNumbers = await common.datasource.partNumbersCache;
      setPartNumbers(partNumbers);
    };
    loadPartNumbers();
    loadWorkspaces();
  }, [common.datasource]);

  const handleColumnChange = (items: Array<SelectableValue<string>>) => {
    common.handleQueryChange({ ...common.query, columns: items.map(i => i.value!) }, false);
  };

  const loadColumnOptions = () => {
    const columnOptions = (tableProperties.value?.columns ?? []).map(c => toOption(c.name));
    columnOptions.unshift(...getVariableOptions());
    return columnOptions;
  };

  const onQueryByChange = (queryBy: string) => {
    if (queryBy !== '') {
      setDataTablesFilterValid(true);
    } else {
      setDataTablesFilterValid(false);
    }
    common.query.queryBy = queryBy;
    common.handleQueryChange({ ...common.query, queryBy: queryBy }, true);
  };

  const onParameterChange = (queryBy: string) => {
    common.query.queryByResults = queryBy;
    common.handleQueryChange({ ...common.query, queryByResults: queryBy }, true);
  };

  return (
    <>
      <InlineField label="Query type" labelWidth={30} tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={enumToOptions(DataFrameQueryType)}
          value={common.query.type}
          onChange={value => common.handleQueryChange({ ...common.query, type: value }, true)}
        />
      </InlineField>
      {/* <InlineField label="Id">
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
        </InlineField> */}
      <HorizontalGroup align="flex-start" spacing="xs">
        <VerticalGroup spacing="xs">
          <div style={{ marginTop: '10px' }}>
            {common.query.type === DataFrameQueryType.Properties && (
              <>
                <InlineField label="Properties" labelWidth={30} tooltip={tooltips.columns}>
                  <MultiSelect
                    isLoading={tableProperties.loading}
                    options={loadColumnOptions()}
                    onChange={handleColumnChange}
                    onBlur={common.onRunQuery}
                    value={common.query.columns.map(toOption)}
                    width={65.5}
                  />
                </InlineField>
              </>
            )}
            <InlineField
              label="Query by results properties"
              labelWidth={30}
              tooltip={tooltips.queryType}
              required={false}
            >
              <ResultsQueryBuilder
                filter={common.query.queryByResults}
                workspaces={workspaces}
                status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
                partNumbers={partNumbers}
                globalVariableOptions={common.datasource.globalVariableOptions()}
                onChange={(event: any) => onParameterChange(event.detail.linq)}
              ></ResultsQueryBuilder>
            </InlineField>
            <InlineField label="Query by data table properties" labelWidth={30} tooltip={tooltips.queryType} required>
              <DataframeQueryBuilder
                filter={common.query.queryBy}
                workspaces={workspaces}
                globalVariableOptions={common.datasource.globalVariableOptions()}
                onChange={(event: any) => onQueryByChange(event.detail.linq)}
              ></DataframeQueryBuilder>
            </InlineField>
            {isDataTablesFilterValid && (
              <InlineField label="Query by column names" labelWidth={30} tooltip={tooltips.queryType} required={false}>
                <ResultsQueryBuilder
                  filter={common.query.queryBy}
                  workspaces={workspaces}
                  status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
                  partNumbers={partNumbers}
                  globalVariableOptions={common.datasource.globalVariableOptions()}
                  onChange={(event: any) => onParameterChange(event.detail.linq)}
                ></ResultsQueryBuilder>
              </InlineField>
            )}
            {common.query.type === DataFrameQueryType.Data && (
              <InlineField label="Columns" labelWidth={30} tooltip={tooltips.columns} required>
                <MultiSelect
                  isLoading={tableProperties.loading}
                  options={loadColumnOptions()}
                  onChange={handleColumnChange}
                  onBlur={common.onRunQuery}
                  value={common.query.columns.map(toOption)}
                  width={65.5}
                />
              </InlineField>
            )}
          </div>
        </VerticalGroup>
        <div style={{ margin: '10px 0 0' }}>
          {common.query.type === DataFrameQueryType.Data && (
            <>
              <VerticalGroup>
                <div>
                  <InlineField label="Use decimation " labelWidth={25} tooltip={tooltips.decimation}>
                    <InlineSwitch
                      value={common.query.useDecimation}
                      onChange={event =>
                        common.handleQueryChange({ ...common.query, useDecimation: event.currentTarget.checked }, true)
                      }
                    />
                  </InlineField>
                  {common.query.useDecimation && (
                    <div style={{ marginBottom: '15px' }}>
                      <InlineField label="Decimation Method" labelWidth={25} tooltip={tooltips.decimation}>
                        <Select
                          options={decimationMethods}
                          onChange={item =>
                            common.handleQueryChange({ ...common.query, decimationMethod: item.value! }, true)
                          }
                          value={common.query.decimationMethod}
                          width={20}
                        />
                      </InlineField>
                      <InlineField label="X axis column" labelWidth={25} tooltip={tooltips.columns}>
                        <Select
                          options={[]}
                          onChange={item =>
                            common.handleQueryChange({ ...common.query, XAxisColumn: item.value! }, true)
                          }
                          value={common.query.XAxisColumn}
                          width={20}
                        />
                      </InlineField>
                      <InlineField label="Y axis column" labelWidth={25} tooltip={tooltips.columns}>
                        <Select
                          options={[]}
                          onChange={item =>
                            common.handleQueryChange({ ...common.query, YAxisColumn: item.value! }, true)
                          }
                          value={common.query.YAxisColumn}
                          width={20}
                        />
                      </InlineField>
                    </div>
                  )}
                </div>
              </VerticalGroup>
              <InlineField label="Include index columns" labelWidth={25} tooltip={tooltips.filterNulls}>
                <InlineSwitch
                  value={common.query.useIndexColumn}
                  onChange={event =>
                    common.handleQueryChange({ ...common.query, useIndexColumn: event.currentTarget.checked }, true)
                  }
                ></InlineSwitch>
              </InlineField>
              <InlineField label="Filter nulls" labelWidth={25} tooltip={tooltips.filterNulls}>
                <InlineSwitch
                  value={common.query.filterNulls}
                  onChange={event =>
                    common.handleQueryChange({ ...common.query, filterNulls: event.currentTarget.checked }, true)
                  }
                ></InlineSwitch>
              </InlineField>
              <InlineField label="Use time range" labelWidth={25} tooltip={tooltips.useTimeRange}>
                <InlineSwitch
                  value={common.query.applyTimeFilters}
                  onChange={event =>
                    common.handleQueryChange({ ...common.query, applyTimeFilters: event.currentTarget.checked }, true)
                  }
                ></InlineSwitch>
              </InlineField>
              {!common.query.useDecimation && (
                <InlineField label="Take" labelWidth={25} tooltip={tooltips.decimation}>
                  <AutoSizeInput
                    minWidth={20}
                    maxWidth={20}
                    type="number"
                    defaultValue={common.query.recordCount}
                    onCommitChange={event =>
                      common.handleQueryChange(
                        {
                          ...common.query,
                          recordCount: parseInt((event.target as HTMLInputElement).value, 10),
                        },
                        true
                      )
                    }
                    placeholder="Enter record count"
                    onKeyDown={event => {
                      validateNumericInput(event);
                    }}
                  />
                </InlineField>
              )}
            </>
          )}
          {common.query.type === DataFrameQueryType.Properties && (
            <>
              <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.columns}>
                <Select
                  options={[]}
                  placeholder="Select field to order by"
                  onChange={() => {}}
                  value={common.query.orderBy}
                  defaultValue={common.query.orderBy}
                  width={26}
                />
              </InlineField>
              <InlineField label="Descending" labelWidth={25} tooltip={tooltips.columns}>
                <InlineSwitch
                  onChange={event =>
                    common.handleQueryChange({ ...common.query, descending: event.currentTarget.checked }, true)
                  }
                  value={common.query.descending}
                />
              </InlineField>
              <InlineField label="Take" labelWidth={25} tooltip={tooltips.decimation}>
                <AutoSizeInput
                  minWidth={26}
                  maxWidth={26}
                  type="number"
                  defaultValue={common.query.recordCount}
                  onCommitChange={event =>
                    common.handleQueryChange(
                      {
                        ...common.query,
                        recordCount: parseInt((event.target as HTMLInputElement).value, 10),
                      },
                      true
                    )
                  }
                  placeholder="Enter record count"
                  onKeyDown={event => {
                    validateNumericInput(event);
                  }}
                />
              </InlineField>
            </>
          )}
        </div>
      </HorizontalGroup>
      <FloatingError message={errorMsg} />
    </>
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
