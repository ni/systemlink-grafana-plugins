import { QueryEditorProps } from "@grafana/data";
import { AlarmsDataSource } from "../AlarmsDataSource";
import { InlineField } from "@grafana/ui";
import { AlarmsQueryBuilder } from "./query-builder/AlarmsQueryBuilder";
import { Workspace } from "core/types";
import React, { useState, useEffect } from "react";
import { FloatingError } from "core/errors";
import { AlarmsVariableQuery } from "../types/types";

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

    const onQueryByChange = (value: string) => {
        onChange({ ...query, queryBy: value });
    };

    return (
        <>
            <InlineField label="Query By" labelWidth={12} tooltip={tooltips.queryBy}>
                <AlarmsQueryBuilder
                    filter={query.queryBy}
                    onChange={(event: any) => onQueryByChange(event.detail.linq)}
                    workspaces={workspaces}
                    globalVariableOptions={datasource.listAlarmsDataSource.globalVariableOptions()}
                ></AlarmsQueryBuilder>
            </InlineField>
            <FloatingError message={datasource.listAlarmsDataSource.errorTitle} innerMessage={datasource.listAlarmsDataSource.errorDescription} severity="warning"/>
        </>
    );
};

const tooltips = {
    queryBy: "Specifies the filter to be applied on the queried alarms."
}
