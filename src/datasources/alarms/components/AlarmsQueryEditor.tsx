import React, { useCallback, useEffect } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery, QueryType } from '../types/types';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';
import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { InlineField } from 'core/components/InlineField';
import { labels, tooltips } from '../constants/AlarmsQueryEditor.constants';
import { Combobox, ComboboxOption } from '@grafana/ui';
import { defaultAlarmsCountQuery, defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
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
    const QUERY_TYPE_CONFIG = {
      [QueryType.ListAlarms]: {
        defaultQuery: defaultListAlarmsQuery,
      },
      [QueryType.AlarmsCount]: {
        defaultQuery: defaultAlarmsCountQuery,
      },
    };
    const config = QUERY_TYPE_CONFIG[queryType];

    if (config) {
      handleQueryChange({
        ...query,
        ...config.defaultQuery,
        refId: query.refId,
      });
    }
  }, [query, handleQueryChange]);

  useEffect(() => {
    if (!query.queryType) {
      handleQueryTypeChange(QueryType.ListAlarms);
    }
  }, [query.queryType, handleQueryTypeChange]);

  return (
    <>
      <InlineField label={labels.queryType} labelWidth={26} tooltip={tooltips.queryType}>
        <Combobox
          options={Object.values(QueryType).map(value => ({ label: value, value })) as ComboboxOption[]}
          value={query.queryType}
          width={26}
          onChange={option => {
            if (option) {
              handleQueryTypeChange(option.value as QueryType);
            }
          }}
        />
      </InlineField>
      {query.queryType === QueryType.AlarmsCount && (
        <AlarmsCountQueryEditor
          query={query as AlarmsCountQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.alarmsCountDataSource}
        />
      )}
      {query.queryType === QueryType.ListAlarms && (
        <span>List Alarms query editor</span>
      )}
    </>
  );
}
