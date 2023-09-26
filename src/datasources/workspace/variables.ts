import { DataSourceVariableSupport } from '@grafana/data';
import { WorkspaceDataSource } from './WorkspaceDataSource';
import { WorkspaceQuery } from './types';

export class WorkspaceVariableSupport extends DataSourceVariableSupport<WorkspaceDataSource, WorkspaceQuery> {}
