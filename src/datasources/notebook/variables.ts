import { DataSourceVariableSupport } from '@grafana/data';
import { NotebookQuery } from './types';
import { DataSource } from './datasource';

export class NotebookVariableSupport extends DataSourceVariableSupport<DataSource, NotebookQuery> {}
