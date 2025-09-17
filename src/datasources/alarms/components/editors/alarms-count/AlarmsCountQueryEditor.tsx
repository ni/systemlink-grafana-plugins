import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';
import React from 'react';
import { InlineField } from 'core/components/InlineField';
import { AlarmsQueryBuilder } from '../../query-builder/AlarmsQueryBuilder';
import { labels, tooltips } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';

type Props = {
  query: AlarmsCountQuery;
  handleQueryChange: (query: AlarmsCountQuery, runQuery?: boolean) => void;
};

export function AlarmsCountQueryEditor({ query, handleQueryChange }: Props) {
  const onFilterChange = (event?: Event | React.FormEvent<Element>) => {
    if (event && 'detail' in event) {
      const value = (event as CustomEvent).detail.linq;
      
      if (query.queryBy !== value) {
        query.queryBy = value;
        handleQueryChange({ ...query, queryBy: value });
      }
    }
  };

  return (
  <InlineField label={labels.queryBy} labelWidth={26} tooltip={tooltips.queryBy}>
    <AlarmsQueryBuilder
      filter={query.queryBy}
      globalVariableOptions={[]}
      onChange={onFilterChange}
    />
  </InlineField>
);
}
