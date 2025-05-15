import { QueryBuilderField } from "smart-webcomponents-react";
import { SystemProperties } from "../datasources/system/types";

export const LEGACY_METADATA_TYPE = 'Metadata';

export interface Workspace {
  id: string,
  name: string,
  default: boolean,
  enabled: boolean,
}

export interface QuerySystemsRequest {
  skip?: number,
  take?: number,
  filter?: string,
  projection?: string,
  orderBy?: string
}

export interface QuerySystemsResponse {
  data: SystemProperties[]
  count: number
}

export type DeepPartial<T> = {
  [Key in keyof T]?: DeepPartial<T[Key]>;
};

export interface SystemLinkError {
  error: {
    args: string[];
    code: number;
    message: string;
    name: string;
  }
}

export interface QueryBuilderOption {
  label: string;
  value: string;
}

export interface PropertyFieldKeyValuePair {
  key: string;
  value: string | number;
};

export interface QBField extends QueryBuilderField {
  lookup?: {
    readonly?: boolean;
    dataSource: Array<{
      label: string,
      value: string
    }>;
  },
}
