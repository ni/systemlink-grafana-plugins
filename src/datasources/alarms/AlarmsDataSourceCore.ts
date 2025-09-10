import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse, AppEvents, ScopedVars } from "@grafana/data";
import { AlarmsQuery, QueryAlarmsRequest, QueryAlarmsResponse } from "./types/types";
import { extractErrorInfo } from "core/errors";
import { ExpressionTransformFunction, transformComputedFieldsQuery } from "core/query-builder.utils";
import { AlarmsQueryBuilderFieldNames } from "./constants/AlarmsQueryBuilder.constants";
import { QueryBuilderOperations } from "core/query-builder.constants";
import { QUERY_ALARMS_RELATIVE_PATH } from "./constants/QueryAlarms.constants";

export abstract class AlarmsDataSourceCore extends DataSourceBase<AlarmsQuery> {
  private readonly queryAlarmsUrl = `${this.instanceSettings.url}${QUERY_ALARMS_RELATIVE_PATH}`;

  public abstract runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

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

  protected transformAlarmsQuery(
    queryField: string | undefined,
    scopedVars?: ScopedVars
  ): string | undefined {
    return queryField
      ? transformComputedFieldsQuery(this.templateSrv.replace(queryField, scopedVars), this.alarmsComputedDataFields)
      : undefined;
  }

  private isTimeField(field: AlarmsQueryBuilderFieldNames): boolean {
    const timeFields = [
      AlarmsQueryBuilderFieldNames.AcknowledgedOn,
      AlarmsQueryBuilderFieldNames.FirstOccurrence,
    ];
    return timeFields.includes(field);
  }

  private readonly alarmsComputedDataFields = new Map<string, ExpressionTransformFunction>(
    Object.values(AlarmsQueryBuilderFieldNames).map(field => [
      field,
      this.isTimeField(field) ? this.timeFieldsQuery(field) : this.multipleValuesQuery(field),
    ])
  );

  private multipleValuesQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string, _options?: any) => {
      const isMultiSelect = this.isMultiSelectValue(value);
      const valuesArray = this.getMultipleValuesArray(value);
      const logicalOperator = this.getLogicalOperator(operation);

      return isMultiSelect ? `(${valuesArray
        .map(val => `${field} ${operation} "${val}"`)
        .join(` ${logicalOperator} `)})` : `${field} ${operation} "${value}"`;
    }
  }

  private timeFieldsQuery(field: string): ExpressionTransformFunction {
    return (value: string, operation: string): string => {
      const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
      return `${field} ${operation} "${formattedValue}"`;
    };
  }

  private isMultiSelectValue(value: string): boolean {
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
