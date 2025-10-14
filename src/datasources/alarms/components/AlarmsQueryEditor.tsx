import React, { useCallback, useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery, QueryType } from '../types/types';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';
import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { InlineField } from 'core/components/InlineField';
import { labels, tooltips } from '../constants/AlarmsQueryEditor.constants';
import { Combobox, ComboboxOption } from '@grafana/ui';
import { ListAlarmsQuery } from '../types/ListAlarms.types';
import { defaultAlarmsCountQuery, defaultListAlarmsQuery } from '../constants/defaultQueries';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const [listAlarmsQuery, setListAlarmsQuery] = useState<ListAlarmsQuery>();
  const [alarmsCountQuery, setAlarmsCountQuery] = useState<AlarmsCountQuery>();

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
    switch (queryType) {
      case QueryType.ListAlarms:
        // Preserve the current list alarms query state when switching from AlarmsCount to ListAlarms
        if (query.queryType === QueryType.AlarmsCount) {
          setAlarmsCountQuery(query as AlarmsCountQuery);
        }
        handleQueryChange({
          ...query,
          queryType,
          ...defaultListAlarmsQuery,
          ...listAlarmsQuery,
          refId: query.refId,
        });
        break;
      case QueryType.AlarmsCount:
        // Preserve alarms count query state when switching from ListAlarms to AlarmsCount
        if (query.queryType === QueryType.ListAlarms) {
          setListAlarmsQuery(query as ListAlarmsQuery);
        }
        handleQueryChange({
          ...query,
          queryType,
          ...defaultAlarmsCountQuery,
          ...alarmsCountQuery,
          refId: query.refId,
        });
        break;
      default:
        break;
    }
  }, [query, alarmsCountQuery, listAlarmsQuery, handleQueryChange]);

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
          datasource={datasource.alarmsCountQueryHandler}
        />
      )}
      {query.queryType === QueryType.ListAlarms && (
        <span>List Alarms query editor</span>
      )}
    </>
  );
}
