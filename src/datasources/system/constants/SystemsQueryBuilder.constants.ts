import { QueryBuilderOperations } from "../../../core/query-builder.constants";
import { QBField } from "../../asset/types/CalibrationForecastQuery.types";
import { ConnectionStatusOptions } from "../types";

export enum SystemFieldNames {
    ID = 'id',
    ALIAS = 'alias',
    CONNECTION_STATUS = 'connected.data.state',
    WORKSPACE = 'workspace',
    MODEL = 'grains.data.productname',
    VENDOR = 'grains.data.manufacturer',
    OS_FULL_NAME = 'grains.data.osfullname',
    SCAN_CODE = 'scanCode',
    SYSTEM_START_TIME = 'grains.data.boottime',
    LOCKED_STATUS = 'grains.data.minion_blackout',
}

export const SystemFields: Record<string, QBField> = {
    ID: {
        label: 'System ID',
        dataField: SystemFieldNames.ID,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    ALIAS: {
        label: 'Alias',
        dataField: SystemFieldNames.ALIAS,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name,
        ],
    },
    CONNECTION_STATUS: {
        label: 'Connection Status',
        dataField: SystemFieldNames.CONNECTION_STATUS,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name
        ],
        lookup: {
            dataSource: ConnectionStatusOptions,
        }
    },
    MODEL: {
        label: 'Model',
        dataField: SystemFieldNames.MODEL,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    VENDOR: {
        label: 'Vendor',
        dataField: SystemFieldNames.VENDOR,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
            QueryBuilderOperations.CONTAINS.name,
            QueryBuilderOperations.DOES_NOT_CONTAIN.name,
        ],
    },
    OS_FULL_NAME: {
        label: 'Operating System',
        dataField: SystemFieldNames.OS_FULL_NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    SCAN_CODE: {
        label: 'Scan Code',
        dataField: SystemFieldNames.SCAN_CODE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    LOCKED_STATUS: {
        label: 'Locked Status',
        dataField: SystemFieldNames.LOCKED_STATUS,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
        lookup: {
            dataSource: [
                { label: 'True', value: 'true' },
                { label: 'False', value: 'false' }
            ],
        }
    },
};

export const SystemStaticFields = [
    SystemFields.ID,
    SystemFields.ALIAS,
    SystemFields.MODEL,
    SystemFields.VENDOR,
    SystemFields.OS_FULL_NAME,
    SystemFields.SCAN_CODE,
    SystemFields.CONNECTION_STATUS,
    SystemFields.LOCKED_STATUS,
];
