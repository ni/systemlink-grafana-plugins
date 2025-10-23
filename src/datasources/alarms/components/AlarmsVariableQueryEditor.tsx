import { QueryEditorProps } from "@grafana/data";
import { AlarmsDataSource } from "../AlarmsDataSource";
import { InlineField } from "@grafana/ui";
import { AlarmsQueryBuilder } from "./query-builder/AlarmsQueryBuilder";
import { Workspace } from "core/types";
import React, { useState, useEffect } from "react";
import { FloatingError } from "core/errors";
import { AlarmsVariableQuery } from "../types/types";
import { ERROR_SEVERITY_WARNING, LABEL_WIDTH, labels, tooltips } from "../constants/AlarmsQueryEditor.constants";

type Props = QueryEditorProps<AlarmsDataSource, AlarmsVariableQuery>;

export function AlarmsVariableQueryEditor({ query, onChange, datasource }: Props) {

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.listAlarmsDataSource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();
  }, [datasource]);

  const onFilterChange = (filter: string) => {
    if (query.filter !== filter) {
      onChange({ ...query, filter });
    }
  };

  return (
    <>
      <InlineField
        label={labels.queryBy}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.queryBy}
      >
        <AlarmsQueryBuilder
          filter={query.filter}
          onChange={(event: any) => onFilterChange(event.detail.linq)}
          workspaces={workspaces}
          globalVariableOptions={datasource.listAlarmsDataSource.globalVariableOptions()}
        ></AlarmsQueryBuilder>
      </InlineField>
      <FloatingError 
        message={datasource.listAlarmsDataSource.errorTitle} 
        innerMessage={datasource.listAlarmsDataSource.errorDescription} 
        severity={ERROR_SEVERITY_WARNING}
      />
    </>
  );
};
