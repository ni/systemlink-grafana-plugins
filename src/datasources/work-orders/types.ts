import { DataQuery } from '@grafana/schema';

export interface WorkOrdersQuery extends DataQuery {
    queryBy?: string;
    outputType: OutputType;
    orderBy?: string;
    descending?: boolean;
    take?: number;
}

export enum OutputType {
    Properties = "Properties",
    TotalCount = "Total Count"
}

export const OrderByOptions = {
    ID: 'ID',
    UPDATED_AT: 'UPDATED_AT'
};

export const OrderBy = [
    {
        value: OrderByOptions.ID,
        label: 'ID',
        description: `ID of the work order`,
    },
    {
        value: OrderByOptions.UPDATED_AT,
        label: 'Updated At',
        description: `Latest update at time of the work order`,
    }
];
