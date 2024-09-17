import { AssetDataSource } from "../AssetDataSource";
import { AssetQuery } from "../types";
import { CoreApp, QueryEditorProps, SelectableValue, toOption } from "@grafana/data";
import { SystemMetadata } from "../../system/types";

export type Props = QueryEditorProps<AssetDataSource, AssetQuery>

export class AssetQueryEditorCommon {
  readonly datasource: AssetDataSource;
  readonly onChange: (value: AssetQuery) => void;
  readonly query: AssetQuery;
  readonly onRunQuery: () => false | void;
  readonly handleError: (error: Error) => void;

  constructor(readonly props: Props, readonly errorHandler: (error: Error) => void) {
    this.datasource = this.props.datasource;
    this.onChange = this.props.onChange;
    this.query = this.datasource.prepareQuery(this.props.query);
    this.onRunQuery = () => props.app !== CoreApp.Explore && props.onRunQuery();
    this.handleError = errorHandler;
  }

  readonly handleQueryChange = (value: AssetQuery, runQuery: boolean) => {
    this.onChange(value);
    if (runQuery) {
      this.onRunQuery();
    }
  };

  readonly getVariableOptions = (): Array<SelectableValue<string>> => {
    return this.datasource.templateSrv
      .getVariables()
      .map(v => toOption('$' + v.name));
  };

  readonly loadMinionIdOptions = (ids: SystemMetadata[] | void): Array<SelectableValue<string>> => {
    if (!ids) {
      return []
    }
    let options: SelectableValue[] = (ids ?? []).map(
      (system: SystemMetadata): SelectableValue<string> => ({
        label: system.alias ?? system.id,
        value: system.id,
        description: system.state,
      })
    );
    options.unshift(...this.getVariableOptions());

    return options;
  };
}
