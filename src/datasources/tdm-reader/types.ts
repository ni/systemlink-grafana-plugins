import { DataQuery } from '@grafana/schema';

export const SAMPLE_INDEX_AXIS_ID = 'axis:sample-index';
export const TIMESTAMP_AXIS_ID = 'axis:timestamp';
export const TDM_READER_FIELD_LABEL_WIDTH = 20;

export const DEFAULT_FILE_ID = 'tdm-file-001';

export type TdmCondition = ['fileId' | 'fileName', '=' | '<>', string];
export type TdmLogicalOperator = 'and' | 'or' | 'notand' | 'notor';
export type TdmFilter = Array<TdmCondition | TdmLogicalOperator | TdmFilter>;

export interface TdmReaderQuery extends DataQuery {
  fileFilter?: TdmFilter;
  selectedChannelIds?: string[];
  xAxisId?: string;
  decimationMethod?: string;
  // Keep 'flat' readable for saved mockup queries; it now opens the merged view.
  channelView?: 'hierarchy' | 'merged' | 'flat';
}

export interface MockChannel {
  id: string;
  name: string;
  offset: number;
}

export interface MockChannelGroup {
  id: string;
  name: string;
  channels: MockChannel[];
}

export interface MockTdmFile {
  fileId: string;
  fileName: string;
  groups: MockChannelGroup[];
}

export interface ChannelRecord {
  id: string;
  name: string;
  fileId: string;
  fileName: string;
  fileLabel: string;
  groupName: string;
  offset: number;
}
