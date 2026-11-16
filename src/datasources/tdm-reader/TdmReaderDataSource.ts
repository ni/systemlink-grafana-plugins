import {
  DataFrameDTO,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  FieldType,
  TestDataSourceResponse,
} from '@grafana/data';
import { defer, Observable, of } from 'rxjs';
import { getChannelRecords } from './mock-data';
import { getFileFilterState } from './query-utils';
import { MAX_CHANNEL_SELECTIONS } from './channel-selector-utils';
import { DEFAULT_FILE_ID, SAMPLE_INDEX_AXIS_ID, TdmReaderQuery } from './types';

export class TdmReaderDataSource extends DataSourceApi<TdmReaderQuery> {
  getDefaultQuery(): Partial<TdmReaderQuery> {
    return { fileFilter: [['fileId', '=', DEFAULT_FILE_ID]], selectedChannelIds: [], xAxisId: SAMPLE_INDEX_AXIS_ID, channelView: 'hierarchy', decimationMethod: 'LOSSY' };
  }

  query(request: DataQueryRequest<TdmReaderQuery>): Observable<DataQueryResponse> {
    return defer(() => of({
      data: request.targets.filter(target => !target.hide).flatMap(target => {
        const frame = this.runQuery(target, request);
        return frame ? [frame] : [];
      }),
    }));
  }

  private runQuery(query: TdmReaderQuery, request: DataQueryRequest<TdmReaderQuery>): DataFrameDTO | undefined {
    const state = getFileFilterState(query.fileFilter);
    if (state.error) {
      throw new Error(state.error);
    }
    const selectedIds = new Set(query.selectedChannelIds ?? []);
    const channels = getChannelRecords(state.files).filter(channel => selectedIds.has(channel.id));
    if (channels.length > MAX_CHANNEL_SELECTIONS) {
      // The selector reports the limit; do not generate samples for an over-limit target.
      return undefined;
    }
    const rows = channels.flatMap(channel =>
      Array.from({ length: 10 }, (_, sampleIndex) => ({
        ...channel,
        sampleIndex,
        timestamp: request.range.from.valueOf() + sampleIndex * 1000,
        value: Number((channel.offset + sampleIndex * 0.01).toFixed(4)),
      }))
    );
    return {
      refId: query.refId,
      name: 'TDM Reader mock samples',
      fields: [
        { name: 'File ID', type: FieldType.string, values: rows.map(row => row.fileId) },
        { name: 'File Name', type: FieldType.string, values: rows.map(row => row.fileName) },
        { name: 'Channel Group', type: FieldType.string, values: rows.map(row => row.groupName) },
        { name: 'Channel Name', type: FieldType.string, values: rows.map(row => row.name) },
        { name: 'Sample Index', type: FieldType.number, values: rows.map(row => row.sampleIndex) },
        { name: 'Timestamp', type: FieldType.time, values: rows.map(row => row.timestamp) },
        { name: 'Value', type: FieldType.number, config: { displayName: 'Value' }, values: rows.map(row => row.value) },
      ],
    };
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    return { status: 'success', message: 'TDM Reader mockup ready. No SystemLink connection is required or tested.' };
  }
}
