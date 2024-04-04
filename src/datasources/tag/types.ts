import { DataQuery } from '@grafana/schema';

export enum TagQueryType {
  Current = 'Current',
  History = 'History',
}

export interface TagQuery extends DataQuery {
  type: TagQueryType;
  path: string;
  workspace: string;
  properties: boolean;
}

export interface TagVariableQuery {
  path: string;
  workspace: string;
}

interface TagWithValueBase {
  current: {
    value: { value: string };
    timestamp: string;
  } | null;
  tag: {
    path: string;
    properties: Record<string, string> | null;
  };
}

// Legacy tag properties from SystemLink Cloud
interface TagWithValueV1 {
  tag: {
    collect_aggregates: boolean;
    datatype: TagDataType;
    last_updated: number;
    workspace_id: string;
  }
}

// Tag properties renamed in SystemLink Server and Enterprise
interface TagWithValueV2 {
  tag: {
    type: TagDataType;
    workspace: string;
  }
}

export type TagWithValue = TagWithValueBase & TagWithValueV1 & TagWithValueV2;

export interface TagsWithValues {
  tagsWithValues: TagWithValue[];
}

export interface HttpHistoricalValue {
  timestamp: string;
  value: string
}

export interface TypeAndValues {
  type: TagDataType;
  values: HttpHistoricalValue[];
}

export interface TagHistoryResponse {
  results: Record<string, TypeAndValues>
}

export enum TagDataType {
  DOUBLE = "DOUBLE",
  INT = "INT",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  U_INT64 = "U_INT64",
  DATE_TIME = "DATE_TIME"
}

export interface TimeAndTagTypeValues {
  timestamps: string[],
  values: Record<string, { 'type': TagDataType, values: string[] }>
}
