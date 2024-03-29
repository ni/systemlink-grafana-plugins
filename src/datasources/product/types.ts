import { DataQuery } from '@grafana/schema'

export enum ProductQueryOutput {
  ProductDetails = 'Product Details',
  EntityCounts = 'Entity Counts',
  TestResultsCountByStatus = 'Test Results Count By Status',
  TestResults = 'Test Results',
  TestPlans = 'Test Plans',
  Specs = 'Specs',
  Duts = 'Duts'
}

export interface ProductQuery extends DataQuery {
  partNumber: string;
  output: ProductQueryOutput;
}

export interface QueryCountResponse {
  totalCount: number;
}

export interface QueryProductsResponse {
  products: Product[];
}

export interface QuerySpecsResponse {
  specs: Specs[];
}

export interface Product {
  id: string;
  partNumber: string;
  name: string;
  family: string;
  updatedAt: Date;
  keywords: any;
  properties: any;
  fileIds: string[];
}

export interface Specs {
  id?: string;
  version?: number;
  productId?: string;
  specId?: string;
  name?: string | null;
  category?: string | null;
  type?: SpecType;
  symbol?: string | null;
  block?: string | null;
  limit?: SpecLimit | null;
  unit?: string | null;
  conditions?: SpecCondition[] | null;
  keywords?: string[] | null;
  properties?: SpecProperty | null;
  workspace?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export enum SpecType {
  Parametric = 'PARAMETRIC',
  Functional = 'FUNCTIONAL'
}

export interface SpecLimit {
  min: number | null;
  max: number | null;
  typical: number | null;
}

export interface SpecCondition {
  name: string | null;
  value: SpecConditionValue | null;
}

export interface SpecConditionValue {
  conditionType: ConditionType;
  discrete: Array<string | number> | null;
  range: SpecConditionRange[] | null;
  unit: string | null;
}

export interface SpecConditionRange {
  min: number | null;
  max: number | null;
  step: number | null;
}

export interface SpecProperty {
  [key: string]: string;
}

export enum ConditionType {
  Numeric = 'NUMERIC',
  String = 'STRING'
}

export interface QueryResultsHttpResponse {
  results: Results[];
  continuationToken: string;
  totalCount?: number;
  error?: ErrorBody;
}

export interface ErrorBody {
  resourceType?: string;
  resourceId?: string;
  name?: string;
  code?: number;
  message?: string;
  args?: string[];
  innerErrors?: ErrorBody[];
}

export interface Results {
  status?: TestResultStatusHttp;
  startedAt?: string;
  updatedAt?: string;
  programName: string;
  id: string;
  systemId: string;
  hostName: string;
  operator: string;
  partNumber: string;
  serialNumber: string;
  totalTimeInSeconds: number;
  keywords: string[];
  properties: { [key: string]: string };
  fileIds: string[];
  statusTypeSummary?: StatusTypeSummaryHttp;
  workspace: string;
  dataTableIds: string[];
}
export interface TestResultStatusHttp {
  statusType: string;
  statusName: string;
}
export interface StatusTypeSummaryHttp {
  [status: string]: number;
}
