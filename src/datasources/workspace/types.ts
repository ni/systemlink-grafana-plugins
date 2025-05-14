import { DataSourceVariableSupport, VariableSupportType } from '@grafana/data';
import { DataQuery } from '@grafana/schema'
import { WorkOrdersQuery } from 'datasources/work-orders/types';
import { WorkOrdersDataSource } from 'datasources/work-orders/WorkOrdersDataSource';

export interface WorkspaceQuery extends DataQuery {
}

export class WorkspaceDataSourceVariable extends DataSourceVariableSupport<WorkOrdersDataSource> {
    
    getType(): VariableSupportType {
        return VariableSupportType.Datasource;
    }

    getDefaultQuery(): Partial<WorkOrdersQuery> {
        return { };
    }
}
