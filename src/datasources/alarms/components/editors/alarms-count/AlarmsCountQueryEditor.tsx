import { AlarmsCountQuery } from "datasources/alarms/types/AlarmsCount.types";
import React from "react";
import { InlineField } from "core/components/InlineField";
import { AlarmsQueryBuilder } from "../../query-builder/AlarmsQueryBuilder";
import { AlarmsCountDataSource } from "datasources/alarms/query-type-handlers/alarms-count/AlarmsCountDataSource";
import { labels, tooltips } from "datasources/alarms/constants/AlarmsQueryEditor.constants";

type Props = {
  query: AlarmsCountQuery;
  handleQueryChange: (query: AlarmsCountQuery, runQuery?: boolean) => void;
  datasource: AlarmsCountDataSource
};

export function AlarmsCountQueryEditor({ query, handleQueryChange, datasource }: Props) {
  const onFilterChange = (value: string) => {
    if (query.queryBy !== value) {
      query.queryBy = value;
      handleQueryChange({ ...query, queryBy: value });
    }
  }

  return (
    <InlineField label={labels.queryBy} labelWidth={26} tooltip={tooltips.queryBy}>
      <AlarmsQueryBuilder
        filter={query.queryBy}
        globalVariableOptions={datasource.globalVariableOptions()}
        onChange={(event: any) => onFilterChange(event.detail.linq)}
      />
    </InlineField>
  );
}
