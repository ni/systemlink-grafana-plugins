import { QBField } from "core/types";
import { QueryBuilderOperations } from "../../core/query-builder.constants";
import { ConnectionStatusOptions } from "./types";

export enum SystemBackendFieldNames {
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
        label: 'Minion ID',
        dataField: SystemBackendFieldNames.ID,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    ALIAS: {
        label: 'Alias',
        dataField: SystemBackendFieldNames.ALIAS,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: SystemBackendFieldNames.WORKSPACE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
        lookup: {
            dataSource: [],
        }
    },
    CONNECTION_STATUS: {
        label: 'Connection status',
        dataField: SystemBackendFieldNames.CONNECTION_STATUS,
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
        dataField: SystemBackendFieldNames.MODEL,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    VENDOR: {
        label: 'Vendor',
        dataField: SystemBackendFieldNames.VENDOR,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    OS_FULL_NAME: {
        label: 'Operating system',
        dataField: SystemBackendFieldNames.OS_FULL_NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    SCAN_CODE: {
        label: 'Scan code',
        dataField: SystemBackendFieldNames.SCAN_CODE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    LOCKED_STATUS: {
        label: 'Locked status',
        dataField: SystemBackendFieldNames.LOCKED_STATUS,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
        lookup: {
            readonly: true,
            dataSource: [
                { label: 'True', value: 'true' },
                { label: 'False', value: 'false' }
            ],
        }
    }
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

export const defaultProjection = [
    'id',
    'alias',
    'connected.data.state',
    'grains.data.minion_blackout as locked',
    'grains.data.boottime as systemStartTime',
    'grains.data.productname as model',
    'grains.data.manufacturer as vendor',
    'grains.data.osfullname as osFullName',
    'grains.data.ip4_interfaces as ip4Interfaces',
    'grains.data.ip6_interfaces as ip6Interfaces',
    'workspace',
    'scanCode',
];

export const defaultOrderBy = 'createdTimeStamp DESC';

/**
 * Fields that require special boolean handling with .Equals() method
 */
export const BooleanBackendFields = [
    SystemBackendFieldNames.LOCKED_STATUS
] as const;
