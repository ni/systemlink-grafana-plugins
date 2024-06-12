import { SystemMetadata } from "../datasources/system/types";

export interface Workspace {
  name: string;
  id: string;
}

export interface QuerySystemsRequest {
  skip?: number,
  take?: number,
  filter?: string,
  projection?: string,
  orderBy?: string
}

export interface QuerySystemResponse {
  data: SystemMetadata[]
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
