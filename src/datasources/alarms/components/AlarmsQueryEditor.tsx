import React, { useCallback, useEffect, useMemo } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery, QueryType } from '../types/types';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';
import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { InlineField } from 'core/components/InlineField';
import { LABEL_WIDTH, labels, tooltips } from '../constants/AlarmsQueryEditor.constants';
import { Combobox, Stack } from '@grafana/ui';
import { defaultAlarmsCountQuery, defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const QUERY_TYPE_CONFIG = useMemo(() => ({
    [QueryType.ListAlarms]: {
      defaultQuery: defaultListAlarmsQuery,
    },
    [QueryType.AlarmsCount]: {
      defaultQuery: defaultAlarmsCountQuery,
    },
  }), []);

  const handleQueryChange = useCallback(
    (query: AlarmsQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  const handleQueryTypeChange = useCallback((queryType: QueryType): void => {
    const config = QUERY_TYPE_CONFIG[queryType];

    handleQueryChange({
      ...query,
      ...config.defaultQuery,
      refId: query.refId,
    });
  }, [query, handleQueryChange, QUERY_TYPE_CONFIG]);

  useEffect(() => {
    if (!query.queryType) {
      handleQueryTypeChange(QueryType.ListAlarms);
    }
  }, [query.queryType, handleQueryTypeChange]);

  return (
    <Stack direction='column'>
      <InlineField
        label={labels.queryType}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.queryType}
      >
        <Combobox
          options={Object.values(QueryType).map(value => ({ label: value, value }))}
          value={query.queryType}
          width={65}
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
        <span>List Alarms query editor</span>
      )}
    </Stack>
  );
}
