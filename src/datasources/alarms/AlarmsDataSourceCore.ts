import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse, AppEvents, ScopedVars } from "@grafana/data";
import { AlarmsQuery, QueryAlarmsRequest, QueryAlarmsResponse } from "./types/types";
import { extractErrorInfo } from "core/errors";
import { QUERY_ALARMS_RELATIVE_PATH } from "./constants/QueryAlarms.constants";
import { ExpressionTransformFunction, transformComputedFieldsQuery } from "core/query-builder.utils";
import { ALARMS_TIME_FIELDS, AlarmsQueryBuilderFields } from "./constants/AlarmsQueryBuilder.constants";
import { QueryBuilderOption, Workspace } from "core/types";
import { WorkspaceUtils } from "shared/workspace.utils";
import { getVariableOptions } from "core/utils";
import { QueryBuilderOperations } from "core/query-builder.constants";

export abstract class AlarmsDataSourceCore extends DataSourceBase<AlarmsQuery> {
  private readonly queryAlarmsUrl = `${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`;
  private _workspaceUtils?: WorkspaceUtils;

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
    } catch (_error){
      // #AB3283306 - Error handling for workspace dependency
      return new Map<string, Workspace>();
    }
  }

  protected transformAlarmsQuery(scopedVars: ScopedVars, query?: string): string | undefined {
    return query
      ? transformComputedFieldsQuery(this.templateSrv.replace(query, scopedVars), this.computedDataFields)
      : undefined;
  }

  private get workspaceUtils(): WorkspaceUtils {
    if (!this._workspaceUtils) {
      this._workspaceUtils = new WorkspaceUtils(this.instanceSettings, this.backendSrv);
    }
    return this._workspaceUtils;
  }

  private readonly computedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(AlarmsQueryBuilderFields).map(field => {
      const dataField = field.dataField as string;

      return [
        dataField,
        this.isTimeField(dataField)
          ? this.timeFieldsQuery(dataField)
          : this.multiValueVariableQuery(dataField),
      ];
    })
  );

  private timeFieldsQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string): string => {
      const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
      return `${field} ${operation} "${formattedValue}"`;
    };
  }

  private isTimeField(field: string): boolean {
    return ALARMS_TIME_FIELDS.includes(field);
  }

  private multiValueVariableQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      const isMultiSelect = this.isMultiValueExpression(value);
      const valuesArray = this.getMultipleValuesArray(value);
      const logicalOperator = this.getLogicalOperator(operation);

      return isMultiSelect ? `(${valuesArray
        .map(val => `${field} ${operation} "${val}"`)
        .join(` ${logicalOperator} `)})` : `${field} ${operation} "${value}"`;
    }
  }

  private isMultiValueExpression(value: string): boolean {
    return value.startsWith('{') && value.endsWith('}');
  }

  private getMultipleValuesArray(value: string): string[] {
    return value.replace(/({|})/g, '').split(',');
  }

  private getLogicalOperator(operation: string): string {
    return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
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
