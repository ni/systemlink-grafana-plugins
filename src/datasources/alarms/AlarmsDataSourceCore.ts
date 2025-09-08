import { DataSourceBase } from "core/DataSourceBase";
import { DataQueryRequest, DataFrameDTO, TestDataSourceResponse, AppEvents } from "@grafana/data";
import { AlarmsQuery, QueryAlarmsRequestBody, QueryAlarmsResponse } from "./types/types";
import { extractErrorInfo } from "core/errors";

export abstract class AlarmsDataSourceCore extends DataSourceBase<AlarmsQuery> {
  baseUrl = `${this.instanceSettings.url}/nialarm/v1`;
  queryAlarmsUrl = `${this.baseUrl}/query-instances-with-filter`;

  abstract runQuery(query: AlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO>;

  abstract shouldRunQuery(query: AlarmsQuery): boolean;

  async queryAlarms(alarmsRequestBody: QueryAlarmsRequestBody): Promise<QueryAlarmsResponse> {
    try {
      return await this.post<QueryAlarmsResponse>(
        this.queryAlarmsUrl,
        alarmsRequestBody,
        { showErrorAlert: false } // suppress default error alert since we handle errors manually
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

  testDatasource(): Promise<TestDataSourceResponse> {
    throw new Error("Method not implemented.");
  }
}
