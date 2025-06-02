import { QueryEditorProps, SelectableValue } from "@grafana/data";
import { VerticalGroup, InlineField, Select, InlineSwitch } from "@grafana/ui";
import React, { useCallback } from "react";
import { OrderBy, WorkOrdersVariableQuery } from "../types";
import { WorkOrdersDataSource } from "../WorkOrdersDataSource";
import { WorkOrdersQueryBuilder } from "./query-builder/WorkOrdersQueryBuilder";
import { tooltips } from "../constants/QueryEditor.constants";

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersVariableQuery>;

export function WorkOrdersVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = useCallback(
    (query: WorkOrdersVariableQuery): void => {
      onChange(query);
    }, [onChange]
  );

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onQueryByChange = (queryBy: string) => {
    if (query.queryBy !== queryBy) {
      query.queryBy = queryBy;
      handleQueryChange({ ...query, queryBy });
    }
  };


  return (
    <VerticalGroup>
      <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
        <WorkOrdersQueryBuilder
          filter={query.queryBy}
          globalVariableOptions={datasource.globalVariableOptions()}
          onChange={(event: any) => onQueryByChange(event.detail.linq)}
        ></WorkOrdersQueryBuilder>
      </InlineField>
      <div>
        <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.orderBy}>
          <Select
            options={[...OrderBy] as SelectableValue[]}
            placeholder="Select a field to set the query order"
            onChange={onOrderByChange}
            value={query.orderBy}
            defaultValue={query.orderBy}
            width={26}
          />
        </InlineField>
        <InlineField label="Descending" labelWidth={25} tooltip={tooltips.descending}>
          <InlineSwitch
            onChange={event => onDescendingChange(event.currentTarget.checked)}
            value={query.descending}
          />
        </InlineField>
      </div>
    </VerticalGroup >
  );
}
