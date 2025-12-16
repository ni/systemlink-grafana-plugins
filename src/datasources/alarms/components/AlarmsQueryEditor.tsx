import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery, QueryType } from '../types/types';
import { InlineField } from 'core/components/InlineField';
import { CONTROL_WIDTH, LABEL_WIDTH, labels, queryTypeOptions, tooltips } from '../constants/AlarmsQueryEditor.constants';
import { Combobox, Space, Stack } from '@grafana/ui';
import { DEFAULT_QUERY_TYPE, defaultAlarmTrendQuery, defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';
import { ListAlarmsQuery } from '../types/ListAlarms.types';
import { ListAlarmsQueryEditor } from './editors/list-alarms/ListAlarmsQueryEditor';
import { AlarmTrendQueryEditor } from './editors/alarm-trend/AlarmTrendQueryEditor';
import { AlarmTrendQuery } from '../types/AlarmTrend.types';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  query = datasource.prepareQuery(query);

  const [listAlarmsQuery, setListAlarmsQuery] = useState<ListAlarmsQuery>();
  const [alarmTrendQuery, setAlarmTrendQuery] = useState<AlarmTrendQuery>();

  const QUERY_TYPE_CONFIG = useMemo(() => ({
    [QueryType.ListAlarms]: {
      defaultQuery: defaultListAlarmsQuery,
      savedQuery: listAlarmsQuery,
    },
    [QueryType.AlarmTrend]: {
      defaultQuery: defaultAlarmTrendQuery,
      savedQuery: alarmTrendQuery,
    },
  }), [listAlarmsQuery, alarmTrendQuery]);

  const handleQueryChange = useCallback(
    (query: AlarmsQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  const saveCurrentQueryState = useCallback((): void => {
    switch (query.queryType) {
      case QueryType.ListAlarms:
        setListAlarmsQuery(query as ListAlarmsQuery);
        break;
      case QueryType.AlarmTrend:
        setAlarmTrendQuery(query as AlarmTrendQuery);
        break;
    }
  }, [query]);

  const handleQueryTypeChange = useCallback((queryType: QueryType): void => {
    const config = QUERY_TYPE_CONFIG[queryType];

    saveCurrentQueryState();
    handleQueryChange({
      ...query,
      queryType,
      ...config.defaultQuery,
      ...config.savedQuery,
      refId: query.refId,
    });
  }, [query, handleQueryChange, QUERY_TYPE_CONFIG, saveCurrentQueryState]);

  useEffect(() => {
    if (!query.queryType) {
      handleQueryTypeChange(DEFAULT_QUERY_TYPE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack direction='column' gap={0}>
      <InlineField
        label={labels.queryType}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.queryType}
      >
        <Combobox
          options={queryTypeOptions}
          value={query.queryType}
          width={CONTROL_WIDTH}
          onChange={option => {
            handleQueryTypeChange(option.value as QueryType);
          }}
        />
      </InlineField>
      {query.queryType === QueryType.ListAlarms && (
        <ListAlarmsQueryEditor
          query={query as ListAlarmsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.listAlarmsQueryHandler}
        />
      )}
      {query.queryType === QueryType.AlarmTrend && (
        <>
          <Space v={1} />
          <AlarmTrendQueryEditor
            query={query as AlarmTrendQuery}
            handleQueryChange={handleQueryChange}
            datasource={datasource.alarmTrendQueryHandler}
          />
        </>
      )}
    </Stack>
  );
}
