import { lastValueFrom, map } from 'rxjs';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  DataQueryError,
  FieldType,
} from '@grafana/data';

import { BackendSrvRequest, getBackendSrv, getTemplateSrv, isFetchError } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, TagData, TagHistoryCall } from './types';

// TODO:
// add frame that displays the data form the tag historian object in time vs value.
// add functionality to read through the returned historian object and get the values and times out of it.

interface TestingStatus {
  message?: string;
  status: string;
}

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  constructor(private instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    try {
      // Return a constant for each query.
      const data = await Promise.all(
        options.targets.map(async (target) => {
          const tagPath = getTemplateSrv().replace(target.TagPath, options.scopedVars);

          const tagWithValue = await this.queryTagPath(tagPath)

          if (!target.tagHistory) {
            console.log('Tag Basic query started');

            // TAG SERVICE
            //  --------------------------------------------------------------------
  
            // dataframe we will use to store all of the value and aggregates
            // by default has current value of the specified tag.
            const frame = new MutableDataFrame({
              refId: target.refId,
              fields: [
                {
                  name: 'Tag Path',
                  values: [`${tagWithValue.tag.path}`],
                  type: FieldType.string,
                },
                {
                  name: 'Current',
                  values: [tagWithValue.current.value.value],
                  type: FieldType.number,
                },
              ],
            });

            // handle case when the tag does not have any aggregates
            if (tagWithValue.current.value.type === 'STRING') {
              target.aggregates = [];
            }

            // logic for handling the Aggregates
            let i = 0;
            while (target.aggregates && i < target.aggregates.length) {
              if (target.aggregates[i] === 'min') {
                frame.addField({ name: 'Min', values: [tagWithValue.aggregates.min] });
              } else if (target.aggregates[i] === 'max') {
                frame.addField({ name: 'Max', values: [tagWithValue.aggregates.max] });
              } else if (target.aggregates[i] === 'mean') {
                frame.addField({ name: 'Mean', values: [tagWithValue.aggregates.avg] });
              } else if (target.aggregates[i] === 'count') {
                frame.addField({ name: 'Count', values: [tagWithValue.aggregates.count] });
              }
              i++;
            }

            return frame;
          } else if (target.tagHistory) {
            // Adding data to each column is going to look like
            // frame.add({NAME_OF_FIELD: value})
            // where NAME_OF_FIELD is the name you designated above.
            // eg:
            // frame.add({ Min: 2, 123: '4444' });

            // Messing around with the fetch post requests
            // -------------------------------------------------------------
            // TAG HISTORIAN SERVICE
            // decimation paramater

            let tag_history_call;

            tag_history_call = await lastValueFrom(
              this.fetchTagHistory<TagHistoryCall>('POST', 'tags/query-decimated-history', {
                data: {
                  paths: [tagWithValue.tag.path],
                  workspace: tagWithValue.tag.workspace_id,
                  startTime: options.range.from.toISOString(),
                  endTime: options.range.to.toISOString(),
                  decimation: 1000,
                  sortOrder: 'ASCENDING',
                },
              })
            );

            const tp = tagWithValue.tag.path.toString();

            const frame = new MutableDataFrame({
              refId: target.refId,
              fields: [
                { name: 'time', type: FieldType.time },
                { name: 'value', type: FieldType.number },
              ],
            });

            for (let t = 0; t < tag_history_call.data.results[tp].values.length; t += 1) {
              frame.add({
                // time: tag_history_data.data.values[t].timestamp,
                time: new Date(tag_history_call.data.results[tp].values[t].timestamp).getTime(),
                value: tag_history_call.data.results[tp].values[t].value,
              });
            }

            // ------------------

            return frame;
          } else {
            return;
          }
        })
      );
      return { data };
    } catch (error) {
      return { data: [], error: this.createDataQueryError(error) };
    }
  }

  // this needs to be modified to make sure that its testing the base url for
  // https://test.systemlink.io/
  // https://test.systemlink.io/nitag/v2
  async testDatasource(): Promise<TestingStatus> {
    return lastValueFrom(
      this.fetch('GET', 'nitag/v2', { params: { take: 1 } }).pipe(
        map((_) => {
          return { status: 'success', message: 'Data source connected and authentication successful!' };
        })
      )
    );
  }

  // async testDatasource(): Promise<TestingStatus> {
  //   return lastValueFrom(
  //     this.fetch('GET', '', { params: { take: 1 } }).pipe(
  //       map((_) => {
  //         return { status: 'success', message: 'Data source connected and authentication successful!' };
  //       })
  //     )
  //   );
  // }

  private fetch<T>(method: string, route: string, config?: Omit<BackendSrvRequest, 'url' | 'method'>) {
    const url = `${this.instanceSettings.url}/${route}`;
    const req: BackendSrvRequest = {
      url,
      method,
      ...config,
    };
    return getBackendSrv().fetch<T>(req);
  }

  // The route for this is always going to be 'tags/query-history' might be worth putting that in instead of inputting a route each time
  // Change service to use the query-decimated-history
  private fetchTagHistory<T>(method: string, route: string, config?: Omit<BackendSrvRequest, 'url' | 'method'>) {
    const url = `${this.instanceSettings.url}/nitaghistorian/v2/${route}`;
    const req: BackendSrvRequest = {
      url,
      method,
      ...config,
    };
    return getBackendSrv().fetch<T>(req);
  }

  private queryTagPath(path: string) {
    const url = `${this.instanceSettings.url}/nitag/v2/query-tags-with-values`;
    const req: BackendSrvRequest = {
      url,
      method: 'POST',
      data: { filter: `path == "${path}"`},
    };
    return lastValueFrom(
      getBackendSrv().fetch<{tagsWithValues: TagData[]}>(req).pipe(map(res => res.data.tagsWithValues[0]))
    );
  }

  private createDataQueryError(error: unknown): DataQueryError {
    if (!isFetchError(error)) {
      throw error;
    }

    return {
      message: `${error.status} - ${error.statusText}`,
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    };
  }
}
