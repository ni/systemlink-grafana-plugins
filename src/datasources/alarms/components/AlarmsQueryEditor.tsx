import React, { useCallback, useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery, QueryType } from '../types/types';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';
import { AlarmsCountQuery } from '../types/AlarmsCount.types';
import { InlineField } from 'core/components/InlineField';
import { labels, tooltips } from '../constants/AlarmsQueryEditor.constants';
import { Combobox, ComboboxOption } from '@grafana/ui';
import { defaultAlarmsCountQuery, defaultListAlarmsQuery } from '../constants/DefaultQueries.constants';
import { ListAlarmsQueryEditor } from './editors/list-alarms/ListAlarmsQueryEditor';
import { ListAlarmsQuery } from '../types/ListAlarms.types';

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

  const saveCurrentQueryState = useCallback((): void => {
    switch (query.queryType) {
      case QueryType.ListAlarms:
        setListAlarmsQuery(query as ListAlarmsQuery);
        break;
      case QueryType.AlarmsCount:
        setAlarmsCountQuery(query as AlarmsCountQuery);
        break;
    }
  }, [query]);

  const handleQueryTypeChange = useCallback((queryType: QueryType): void => {
    const QUERY_TYPE_CONFIG = {
      [QueryType.ListAlarms]: {
        defaultQuery: defaultListAlarmsQuery,
        savedQuery: listAlarmsQuery,
      },
      [QueryType.AlarmsCount]: {
        defaultQuery: defaultAlarmsCountQuery,
        savedQuery : alarmsCountQuery,
      },
    };
    const config = QUERY_TYPE_CONFIG[queryType];

    saveCurrentQueryState();

    if (config) {
      handleQueryChange({
        ...query,
        ...config.defaultQuery,
        ...config.savedQuery,
        refId: query.refId,
      });
    }
  }, [query, handleQueryChange, alarmsCountQuery, listAlarmsQuery, saveCurrentQueryState]);

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
        <ListAlarmsQueryEditor
          query={query as ListAlarmsQuery}
          handleQueryChange={handleQueryChange}
          datasource={datasource.listAlarmsDataSource}
        />
      )}
    </>
  );
}
