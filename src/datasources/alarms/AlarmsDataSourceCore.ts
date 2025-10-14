import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse, AppEvents, ScopedVars, DataSourceInstanceSettings } from "@grafana/data";
import { AlarmsQuery, QueryAlarmsRequest, QueryAlarmsResponse } from "./types/types";
import { extractErrorInfo } from "core/errors";
import { QUERY_ALARMS_RELATIVE_PATH } from "./constants/QueryAlarms.constants";
import { ExpressionTransformFunction, multipleValuesQuery, timeFieldsQuery, transformComputedFieldsQuery } from "core/query-builder.utils";
import { ALARMS_TIME_FIELDS, AlarmsQueryBuilderFields } from "./constants/AlarmsQueryBuilder.constants";
import { QueryBuilderOption, Workspace } from "core/types";
import { WorkspaceUtils } from "shared/workspace.utils";
import { getLogicalOperator, getVariableOptions, multipleValuesQuery, timeFieldsQuery } from "core/utils";
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from "@grafana/runtime";

export abstract class AlarmsDataSourceCore extends DataSourceBase<AlarmsQuery> {
  public errorTitle?: string;
  public errorDescription?: string;

  private readonly queryAlarmsUrl = `${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`;
  private readonly workspaceUtils: WorkspaceUtils;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
  }

  public abstract runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;
  public readonly globalVariableOptions = (): QueryBuilderOption[] => getVariableOptions(this);

  protected async queryAlarms(alarmsRequestBody: QueryAlarmsRequest): Promise<QueryAlarmsResponse> {
    try {
      return await this.post<QueryAlarmsResponse>(
        this.queryAlarmsUrl,
        alarmsRequestBody,
        { showErrorAlert: false }
      );
    } catch (error) {
      const errorDetails = extractErrorInfo((error as Error).message);
      const errorMessage = this.getStatusCodeErrorMessage(errorDetails);

      this.appEvents.publish?.({
        type: AppEvents.alertError.name,
        payload: ['Error during alarms query', errorMessage],
      });

      throw new Error(errorMessage);
    }
  }

  public async loadWorkspaces(): Promise<Map<string, Workspace>> {
    try {
      return await this.workspaceUtils.getWorkspaces();
    } catch (error){
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, Workspace>();
    }
  }

  protected transformAlarmsQuery(scopedVars: ScopedVars, query?: string): string | undefined {
    return query
      ? transformComputedFieldsQuery(this.templateSrv.replace(query, scopedVars), this.computedDataFields)
      : undefined;
  }

  private readonly computedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(AlarmsQueryBuilderFields).map(field => {
      const dataField = field.dataField as string;

      if (dataField === AlarmsQueryBuilderFields.SOURCE.dataField) {
        return [dataField, this.getSourceTransformation()];
      } else if (this.isTimeField(dataField)) {
        return [dataField, timeFieldsQuery(dataField)];
      } else {
        return [dataField, multipleValuesQuery(dataField)];
      }
    })
  );

  private handleDependenciesError(error: unknown): void {
    const errorDetails = extractErrorInfo((error as Error).message);
    this.errorTitle = 'Warning during alarms query';
    switch (errorDetails.statusCode) {
      case '404':
        this.errorDescription = 'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.';
        break;
      case '429':
        this.errorDescription = 'The query builder lookups failed due to too many requests. Please try again later.';
        break;
      case '504':
        this.errorDescription = `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`;
        break;
      default:
        this.errorDescription = errorDetails.message
          ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
          : 'Some values may not be available in the query builder lookups due to an unknown error.';
    }
  }

  private isTimeField(field: string): boolean {
    return ALARMS_TIME_FIELDS.includes(field);
  }

  private getSourceTransformation(): ExpressionTransformFunction {
    return (value: string, operation: string) => {
      const systemCustomProperty = 'properties.system';
      const minionIdCustomProperty = 'properties.minionId';
      const systemExpression = multipleValuesQuery(systemCustomProperty)(value, operation);
      const minionExpression = multipleValuesQuery(minionIdCustomProperty)(value, operation);
      const logicalOperator = getLogicalOperator(operation);

      return `(${systemExpression} ${logicalOperator} ${minionExpression})`;
    };
  }

  private getStatusCodeErrorMessage(errorDetails: { statusCode: string; message: string }): string {
    let errorMessage: string;
    switch (errorDetails.statusCode) {
      case '':
        errorMessage = 'The query failed due to an unknown error.';
        break;
      case '404':
        errorMessage =
          'The query to fetch alarms failed because the requested resource was not found. Please check the query parameters and try again.';
        break;
      case '429':
        errorMessage = 'The query to fetch alarms failed due to too many requests. Please try again later.';
        break;
      case '504':
        errorMessage =
          'The query to fetch alarms experienced a timeout error. Narrow your query with a more specific filter and try again.';
        break;
      default:
        errorMessage = `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
        break;
    }
    return errorMessage;
  }

  public shouldRunQuery(query: AlarmsQuery): boolean {
    return !query.hide;
  }

  public testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
