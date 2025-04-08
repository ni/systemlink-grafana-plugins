import { DataQueryRequest, DataFrameDTO } from '@grafana/data';
import { OutputType, QueryType, ResultsQuery } from 'datasources/results/types/types';
import { ResultsDataSourceBase } from '../ResultsDataSourceBase';
import { QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';

export class QueryStepsDataSource extends ResultsDataSourceBase {
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

  runQuery(query: QuerySteps, options: DataQueryRequest): Promise<DataFrameDTO> {
    return Promise.resolve({
      fields: [],
    });
  }

  shouldRunQuery(_: QuerySteps): boolean {
    return true;
  }
}
