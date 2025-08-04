import { QueryEditorProps, CoreApp, SelectableValue } from "@grafana/data";
import { LoadOptionsCallback } from "@grafana/ui";
import { getWorkspaceName, getVariableOptions } from "core/utils";
import _ from "lodash";
import { DataFrameDataSource } from "../DataFrameDataSource";
import { DataFrameQuery, DataFrameQueryType, ValidDataFrameQuery } from "../types";

export type Props = QueryEditorProps<DataFrameDataSource, DataFrameQuery>;

export class DataFrameQueryEditorCommon {
  readonly datasource: DataFrameDataSource;
  readonly onChange: (value: DataFrameQuery) => void;
  readonly query: ValidDataFrameQuery;
  readonly onRunQuery: () => false | void;
  readonly handleError: (error: Error) => void;

  constructor(readonly props: Props, readonly errorHandler: (error: Error) => void) {
    this.datasource = props.datasource;
    this.onChange = props.onChange;
    this.query = this.datasource.processQuery(props.query);
    this.onRunQuery = () => props.app !== CoreApp.Explore && props.onRunQuery();
    this.handleError = errorHandler;
  }

  readonly handleQueryChange = (value: DataFrameQuery, runQuery: boolean) => {
    this.onChange(value);
    if (runQuery) {
      // this.onRunQuery();
    }
  };

  readonly handleIdChange = (item: SelectableValue<string>) => {
    if (this.query.tableId !== item.value) {
      this.handleQueryChange({
        ...this.query,
        tableId: item.value,
        columns: []
      }, this.query.type === DataFrameQueryType.Properties);
    }
  };

  readonly loadTableOptions = _.debounce((query: string, cb?: LoadOptionsCallback<string>) => {
    Promise.all([this.datasource.queryTables(query), this.datasource.getWorkspaces()])
      .then(([tables, workspaces]) =>
        cb?.(
          tables.map(t => ({
            label: t.name,
            value: t.id,
            title: t.id,
            description: getWorkspaceName(workspaces, t.workspace),
          }))
        )
      )
      .catch(this.handleError);
  }, 300);

  readonly handleLoadOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
    if (!query || query.startsWith('$')) {
      return cb?.(getVariableOptions(this.datasource).filter((v) => v.value?.includes(query)));
    }

    this.loadTableOptions(query, cb);
  };
}
