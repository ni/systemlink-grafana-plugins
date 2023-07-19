import { DataQuery, DataSourceJsonData } from '@grafana/data';

// Change types from Any to dateTime, ask Carson
export interface MyQuery extends DataQuery {
  TagPath: string;
  aggregates: string[];
  tagHistory?: boolean;
  take: string;
  startDate: any;
  endDate: any;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  TagPath: '123',
  aggregates: [],
  tagHistory: false,
  take: '100',
  startDate: '',
  endDate: '',
};

export interface TagData {
  aggregates: {
    avg: string;
    count: string;
    max: string;
    min: string;
  };

  current: {
    timestamp: string;
    value: {
      type: string;
      value: string;
    };
  };

  tag: {
    path: string;
    properties: {
      nitagHistoryTTLDays: string;
      nitagMaxHistoryCount: string;
      nitagRetention: string;
    };
    datatype: string;
    workspace_id: string;
  };
}

export interface TagHistoryCall {
  data: any;
  results: any;
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
