import { DataSourceVariableSupport } from '@grafana/data';
import { TestInsightDataSource } from './TestInsightDataSource';
import { TestInsightQuery } from './types';


export class TestInsightsVariableSupport extends DataSourceVariableSupport<TestInsightDataSource,TestInsightQuery > {}
