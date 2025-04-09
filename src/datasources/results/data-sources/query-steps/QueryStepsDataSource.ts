import { DataQueryRequest, DataFrameDTO, FieldType } from '@grafana/data';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { ResultsDataSourceBase } from '../ResultsDataSourceBase';
import { QuerySteps, QueryStepsResponse, StepsProperties, StepsPropertiesOptions, StepsResponseProperties } from 'datasources/results/types/QuerySteps.types';

export class QueryStepsDataSource extends ResultsDataSourceBase {
  queryResultsUrl = this.baseUrl + '/v2/query-steps';

  defaultQuery = {
    queryType: QueryType.Steps,
    properties: [
      StepsProperties.name,
      StepsProperties.status,
      StepsProperties.totalTimeInSeconds
    ] as StepsProperties[],
    outputType: OutputType.Data,
    recordCount: 1000
  };

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  }
  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';


  async querySteps(
    filter?: string,
    orderBy?: string,
    projection?: StepsProperties[],
    take?: number,
    descending?: boolean,
    returnCount = false
  ): Promise<QueryStepsResponse> {
    try {
      return await this.post<QueryStepsResponse>(`${this.queryResultsUrl}`, {
        filter,
        orderBy,
        descending,
        projection,
        take,
        returnCount,
      });
    } catch (error) {
      throw new Error(`An error occurred while querying steps: ${error}`);
    }
  }

  private getTimeRangeFilter(query: QuerySteps, options: DataQueryRequest): string | undefined {
    if (!query.useTimeRange || query.useTimeRangeFor === undefined) {
      return undefined;
    }

    const timeRangeField = this.timeRange[query.useTimeRangeFor];
    const timeRangeFilter = `(${timeRangeField} > "${this.fromDateString}" && ${timeRangeField} < "${this.toDateString}")`;

    return this.templateSrv.replace(timeRangeFilter, options.scopedVars);
  }

  async runQuery(query: QuerySteps, options: DataQueryRequest): Promise<DataFrameDTO> {
    const projection = query.showMeasurements
    ? [...new Set([...(query.properties || []), StepsPropertiesOptions.DATA])]
    : query.properties;

    const responseData = await this.querySteps(
      this.getTimeRangeFilter(query, options),
      query.orderBy,
      projection as StepsProperties[],
      query.recordCount,
      query.descending,
      true
    );

    if(responseData.steps.length === 0) {
      return {
        refId: query.refId,
        fields: [],
      };
    }

    if (query.outputType === OutputType.Data) {
      const stepsResponse = responseData.steps;
      const selectedFields = query.properties?.filter((field: StepsProperties) => Object.keys(stepsResponse[0]).includes(field)) || [];
      const fields = selectedFields.map(field => {
        const isTimeField = field === StepsPropertiesOptions.UPDATED_AT || field === StepsPropertiesOptions.STARTED_AT;
        const fieldType = isTimeField ? FieldType.time : FieldType.string;
        const values = stepsResponse.map(data => data[field as unknown as keyof StepsResponseProperties]);

        switch (field) {
          case StepsPropertiesOptions.PROPERTIES:
          case StepsPropertiesOptions.INPUTS:
          case StepsPropertiesOptions.OUTPUTS:
          case StepsPropertiesOptions.DATA:
            return { name: field, values: values.map(value => value !== null ? JSON.stringify(value) : ''), type: fieldType };
          case StepsPropertiesOptions.STATUS:
            return { name: field, values: values.map((value: any) => value?.statusType), type: fieldType };
          default:
            return { name: field, values, type: fieldType };
        }
      });

      let measurementData = [];
      if (query.showMeasurements) {
        const measurementFields = ['Measurement Name', 'Measurement Value', 'Status', 'Unit', 'Low Limit', 'High Limit'];
        measurementData = measurementFields.map(field => {
          const values = stepsResponse.flatMap(data =>
            data.data?.parameters?.map((param: any) => {
              switch (field) {
                case 'Measurement Name':
                  return param.name || '';
                case 'Measurement Value':
                  return param.measurement || '';
                case 'Status':
                  return param.status || '';
                case 'Unit':
                  return param.units || '';
                case 'Low Limit':
                  return param.lowLimit || '';
                case 'High Limit':
                  return param.highLimit || '';
                default:
                  return '';
              }
            }) || []
          );
          return { name: field, values, type: FieldType.string };
        });
        fields.push(...measurementData.map(data => ({ ...data, name: data.name as StepsProperties })));
      }

      return {
        refId: query.refId,
        fields: fields,
      };
    } else {
      return {
        refId: query.refId,
        fields: [{ name: 'Total count', values: [responseData.totalCount] }],
      };
    }
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
};
