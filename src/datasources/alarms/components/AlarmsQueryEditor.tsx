import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery, QueryType } from '../types/types';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';
import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { InlineField } from 'core/components/InlineField';
import { CONTROL_WIDTH, LABEL_WIDTH, labels, tooltips } from '../constants/AlarmsQueryEditor.constants';
import { Combobox, Space, Stack } from '@grafana/ui';
import { DEFAULT_QUERY_TYPE, defaultAlarmsCountQuery, defaultAlarmsTrendQuery, defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';
import { ListAlarmsQuery } from '../types/ListAlarms.types';
import { ListAlarmsQueryEditor } from './editors/list-alarms/ListAlarmsQueryEditor';
import { AlarmsTrendQueryEditor } from './editors/alarms-trend/AlarmsTrendQueryEditor';
import { AlarmsTrendQuery } from '../types/AlarmsTrend.types';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  query = datasource.prepareQuery(query);

  const [listAlarmsQuery, setListAlarmsQuery] = useState<ListAlarmsQuery>();
  const [alarmsCountQuery, setAlarmsCountQuery] = useState<AlarmsCountQuery>();
  const [alarmsTrendQuery, setAlarmsTrendQuery] = useState<AlarmsTrendQuery>();

  const QUERY_TYPE_CONFIG = useMemo(() => ({
    [QueryType.ListAlarms]: {
      defaultQuery: defaultListAlarmsQuery,
      savedQuery: listAlarmsQuery,
    },
    [QueryType.AlarmsCount]: {
      defaultQuery: defaultAlarmsCountQuery,
      savedQuery: alarmsCountQuery,
    },
    [QueryType.AlarmsTrend]: {
      defaultQuery: defaultAlarmsTrendQuery,
      savedQuery: alarmsTrendQuery,
    },
  }), [listAlarmsQuery, alarmsCountQuery, alarmsTrendQuery]);

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
      case QueryType.AlarmsCount:
        setAlarmsCountQuery(query as AlarmsCountQuery);
        break;
      case QueryType.AlarmsTrend:
        setAlarmsTrendQuery(query as AlarmsTrendQuery);
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
          options={Object.values(QueryType).map(value => ({ label: value, value }))}
          value={query.queryType}
          width={CONTROL_WIDTH}
          onChange={option => {
            handleQueryTypeChange(option.value as QueryType);
          }}
        />
      </InlineField>
      {query.queryType === QueryType.AlarmsCount && (
        <AlarmsCountQueryEditor
          query={query as AlarmsCountQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.alarmsCountQueryHandler}
        />
      )}
      {query.queryType === QueryType.ListAlarms && (
        <ListAlarmsQueryEditor
          query={query as ListAlarmsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.listAlarmsQueryHandler}
        />
      )}
      {query.queryType === QueryType.AlarmsTrend && (
        <>
          <Space v={1} />
          <AlarmsTrendQueryEditor
            query={query as AlarmsTrendQuery}
            handleQueryChange={handleQueryChange}
            datasource={datasource.alarmsTrendQueryHandler}
          />
        </>
      )}
    </Stack>
  );
}
