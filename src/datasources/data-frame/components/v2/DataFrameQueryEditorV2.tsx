import React from "react";
import { DataTableQueryBuilder } from "./query-builders/DataTableQueryBuilder";

export const DataFrameQueryEditorV2 = () => {
    // TODO AB#3259790: Add `Data table properties` Query Builder

    return (
        <DataTableQueryBuilder
            workspaces={null}
            globalVariableOptions={[]}
        />
    );
}
