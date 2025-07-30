import React, { useEffect, useState } from 'react';
import { SelectableValue, toOption } from '@grafana/data';
import {
  InlineField,
  InlineSwitch,
  MultiSelect,
  Select,
  RadioButtonGroup,
  AutoSizeInput,
  Collapse,
  Stack,
  InlineLabel,
  ControlledCollapse,
  MultiCombobox,
  ComboboxOption,
} from '@grafana/ui';
import { decimationMethods } from '../constants';
import _ from 'lodash';
import { getTemplateSrv } from '@grafana/runtime';
// import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import { enumToOptions, validateNumericInput } from 'core/utils';
import { DataFrameQueryType, TableProperties } from '../types';
import { DataframeQueryBuilder } from './DataframeQuerybuilder';
import { Workspace } from 'core/types';
import { ResultsQueryBuilder } from 'datasources/results/components/query-builders/query-results/ResultsQueryBuilder';
import { TestMeasurementStatus } from 'datasources/results/types/types';
import { DataframeColumnsQueryBuilder } from './DataframeColumnQuerybuilder';

export const DataFrameQueryEditor = (props: Props) => {
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const [decimationMethodSelected, setDecimationMethodSelected] = useState<string | null>(null);
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new DataFrameQueryEditorCommon(props, handleError);
  const [isOpen, setIsOpen] = useState(true);
  const [isDecimationOpen, setIsDecimationOpen] = useState(true);
  let columnNameMap: Record<string, string[]> = {};

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [tableProperties, setTableProperties] = useState<TableProperties[] | null>(null);
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

  useEffect(() => {
    const loadTableColumns = async () => {
      const tableProperties = common.datasource.filteredTableColumns;
      setTableProperties(tableProperties);
    };
    loadTableColumns();
  }, [common.datasource.filteredTableColumns, tableProperties]);

  const handleColumnChange = (items: Array<ComboboxOption<string>>) => {
    // const selectedColumnNames = items.map(item => item.value as string);
    // const columnTableMap: Record<string, string[]> = {};

    // selectedColumnNames.forEach(colName => {
    //   Object.entries(columnNameMap).forEach(([tableId, columns]) => {
    //     if (columns.includes(colName)) {
    //       if (!columnTableMap[colName]) {
    //         columnTableMap[colName] = [];
    //       }
    //       columnTableMap[colName].push(tableId);
    //     }
    //   });
    // });

    // Update query columns and optionally use the map as needed
    common.handleQueryChange(
      {
        ...common.query,
        columns: items.map(item => item.value as string),
        // columnTableMap, // Add this to query if you want to use it elsewhere
      },
      false
    );
  };

  // const loadColumnOptions = (): Array<ComboboxOption<string>> => {
  //   const columnOptions: Array<ComboboxOption<string>> = [];
  //   if (tableProperties) {
  //     tableProperties.forEach(table => {
  //       table.columns.forEach(col => {
  //         columnOptions.push({
  //           label: col.name,
  //           value: String(col.name),
  //           group: table.name,
  //         });
  //       });
  //     });
  //   }
  //   columnOptions.unshift(
  //     ...getVariableOptions().map(opt => ({
  //       label: opt.label ?? String(opt.value),
  //       value: String(opt.value!),
  //     }))
  //   );
  //   return columnOptions;
  // };

  const loadColumnOptions = (): Array<ComboboxOption<string>> => {
    if (tableProperties) {
      tableProperties.forEach(table => {
        columnNameMap[table.id] = table.columns.map(col => col.name);
      });
    }
    const columnOptions = Array.from(
      new Map(
        (tableProperties?.flatMap(table => table.columns) ?? []).map(col => [
          col.name,
          {
            label: col.name,
            value: String(col.name),
          },
        ])
      ).values()
    );
    return columnOptions;
  };

  const onQueryByChange = (queryBy: string) => {
    common.query.queryBy = queryBy;
    common.handleQueryChange({ ...common.query, queryBy: queryBy }, true);
  };

  const onQueryByColumnChange = (queryByColumn: string) => {
    common.query.queryByColumn = queryByColumn;
    common.handleQueryChange({ ...common.query, queryByColumn: queryByColumn }, true);
  };

  const onParameterChange = (queryBy: string) => {
    common.query.queryByResults = queryBy;
    common.handleQueryChange({ ...common.query, queryByResults: queryBy }, true);
  };

  const onDecimationMethodChange = (item: SelectableValue<string>) => {
    setDecimationMethodSelected(item.value!);
    common.handleQueryChange({ ...common.query, decimationMethod: item.value! }, true);
  };

  return (
    <>
      <InlineField label="Query type" labelWidth={25} tooltip={tooltips.queryType}>
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
      {common.query.type === DataFrameQueryType.Properties && (
        <>
          <InlineField label="Properties" labelWidth={25} tooltip={tooltips.columns}>
            <MultiCombobox
              options={loadColumnOptions()}
              onChange={handleColumnChange}
              onBlur={common.onRunQuery}
              value={common.query.columns.map(c => ({ label: c, value: c }))}
              width={65.5}
            />
          </InlineField>
        </>
      )}

      <ControlledCollapse label="Query configurations" collapsible={true} isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)}>
        <Stack direction="row" justifyContent={'flex-start'} gap={1} wrap={'wrap'}>
          <Stack direction={'column'} justifyContent={'flex-start'} gap={1}>
            <div style={{ width: '544px' }}>
              <InlineLabel width={68} tooltip={tooltips.queryType} interactive={true}>
                {' '}
                Query by results properties
              </InlineLabel>
              <ResultsQueryBuilder
                filter={common.query.queryByResults}
                workspaces={workspaces}
                status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
                partNumbers={partNumbers}
                globalVariableOptions={common.datasource.globalVariableOptions()}
                onChange={(event: any) => onParameterChange(event.detail.linq)}
              ></ResultsQueryBuilder>
            </div>
            <div style={{ width: '544px' }}>
              <InlineLabel width={'auto'} tooltip={tooltips.queryType} interactive={true}>
                Query by data table properties
              </InlineLabel>
              <DataframeQueryBuilder
                filter={common.query.queryBy}
                workspaces={workspaces}
                globalVariableOptions={common.datasource.globalVariableOptions()}
                onChange={(event: any) => onQueryByChange(event.detail.linq)}
              ></DataframeQueryBuilder>
            </div>
            {common.query.type === DataFrameQueryType.Data && (
              <div style={{ width: '544px' }}>
                <InlineLabel width={'auto'} tooltip={tooltips.queryType} interactive={true}>
                  Query by column properties
                </InlineLabel>
                <DataframeColumnsQueryBuilder
                  filter={common.query.queryByColumn}
                  workspaces={workspaces}
                  globalVariableOptions={common.datasource.globalVariableOptions()}
                  onChange={(event: any) => onQueryByColumnChange(event.detail.linq)}
                ></DataframeColumnsQueryBuilder>
              </div>
            )}
          </Stack>
          <div>
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
        </Stack>
      </ControlledCollapse>
      {common.query.type === DataFrameQueryType.Data && (
        <Collapse label="Column configurations" isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} collapsible={true}>
          <InlineField label="Columns" labelWidth={30} tooltip={tooltips.columns} required>
            <MultiCombobox
              options={loadColumnOptions()}
              onChange={handleColumnChange}
              onBlur={common.onRunQuery}
              width={'auto'}
              minWidth={22}
              maxWidth={125}
              value={common.query.columns.map(c => ({ label: c, value: c }))}
              placeholder="Select columns"
              enableAllOption={true}
            />
          </InlineField>
          <InlineField label="Include index columns" labelWidth={30} tooltip={tooltips.filterNulls}>
            <InlineSwitch
              value={common.query.useIndexColumn}
              onChange={event =>
                common.handleQueryChange({ ...common.query, useIndexColumn: event.currentTarget.checked }, true)
              }
            ></InlineSwitch>
          </InlineField>
          <InlineField label="Filter nulls" labelWidth={30} tooltip={tooltips.filterNulls}>
            <InlineSwitch
              value={common.query.filterNulls}
              onChange={event =>
                common.handleQueryChange({ ...common.query, filterNulls: event.currentTarget.checked }, true)
              }
            ></InlineSwitch>
          </InlineField>
        </Collapse>
      )}
      {common.query.type === DataFrameQueryType.Data && (
        <>
          <Collapse
            label="Decimation settings"
            isOpen={isDecimationOpen}
            onToggle={() => setIsDecimationOpen(!isDecimationOpen)}
            collapsible={true}
          >
            <div>
              <InlineField label="Decimation method" labelWidth={30} tooltip={tooltips.decimation}>
                <Select
                  options={decimationMethods}
                  onChange={onDecimationMethodChange}
                  value={common.query.decimationMethod}
                  width={20}
                />
              </InlineField>
              <InlineField label="X-column" labelWidth={30} tooltip={tooltips.columns}>
                <Select
                  options={[]}
                  onChange={item => common.handleQueryChange({ ...common.query, XAxisColumn: item.value! }, true)}
                  value={common.query.XAxisColumn}
                  width={20}
                />
              </InlineField>
              <InlineField label="Filter x-axis range on zoom/pan" labelWidth={30} tooltip={tooltips.useTimeRange}>
                <InlineSwitch
                  value={common.query.applyTimeFilters}
                  onChange={event =>
                    common.handleQueryChange({ ...common.query, applyTimeFilters: event.currentTarget.checked }, true)
                  }
                ></InlineSwitch>
              </InlineField>
              <InlineField label="Take" labelWidth={30} tooltip={tooltips.decimation}>
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
            </div>
          </Collapse>
        </>
      )}
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
