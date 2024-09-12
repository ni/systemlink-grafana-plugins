import { AssetDataSource } from "../AssetDataSource";
import { AssetQuery } from "../types";
import { CoreApp, QueryEditorProps, SelectableValue, toOption } from "@grafana/data";
import { SystemMetadata } from "../../system/types";

export type Props = QueryEditorProps<AssetDataSource, AssetQuery>

export class AssetQueryEditorCommon {
  readonly datasource: AssetDataSource;
  readonly onChange: (value: AssetQuery) => void;
  readonly query: AssetQuery;
  readonly onRunQuery: () => false | void
  readonly handleError: (error: Error) => void

  constructor(readonly props: Props, readonly errorHandler: (error: Error) => void) {
    this.datasource = this.props.datasource
    this.onChange = this.props.onChange
    this.query = this.datasource.prepareQuery(this.props.query)
    this.onRunQuery = () => props.app !== CoreApp.Explore && props.onRunQuery()
    this.handleError = errorHandler
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

  readonly loadMinionIdOptions = (minionIds: { loading: boolean; error?: undefined; value?: undefined } | {
    loading: true;
    error?: Error | undefined;
    value?: SystemMetadata[] | void
  } | { loading: false; error: Error; value?: undefined } | {
    loading: false;
    error?: undefined;
    value: SystemMetadata[] | void
  }): Array<SelectableValue<string>> => {
    let options: SelectableValue[] = (minionIds.value ?? []).map(
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
