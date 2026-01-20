import { QBField } from "core/types";
import { QueryBuilderOperations } from "../../core/query-builder.constants";
import { ConnectionStatusOptions } from "./types";

export enum SystemUIFieldNames {
    ID = 'id',
    ALIAS = 'alias',
    CONNECTION_STATUS = 'connectionStatus',
    WORKSPACE = 'workspace',
    MODEL = 'model',
    VENDOR = 'vendor',
    OS_FULL_NAME = 'osFullName',
    SCAN_CODE = 'scanCode',
    SYSTEM_START_TIME = 'systemStartTime',
    LOCKED_STATUS = 'lockedStatus',
}

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

export const SystemFieldMapping: Record<string, string> = {
    [SystemUIFieldNames.ID]: SystemBackendFieldNames.ID,
    [SystemUIFieldNames.ALIAS]: SystemBackendFieldNames.ALIAS,
    [SystemUIFieldNames.CONNECTION_STATUS]: SystemBackendFieldNames.CONNECTION_STATUS,
    [SystemUIFieldNames.WORKSPACE]: SystemBackendFieldNames.WORKSPACE,
    [SystemUIFieldNames.MODEL]: SystemBackendFieldNames.MODEL,
    [SystemUIFieldNames.VENDOR]: SystemBackendFieldNames.VENDOR,
    [SystemUIFieldNames.OS_FULL_NAME]: SystemBackendFieldNames.OS_FULL_NAME,
    [SystemUIFieldNames.SCAN_CODE]: SystemBackendFieldNames.SCAN_CODE,
    [SystemUIFieldNames.SYSTEM_START_TIME]: SystemBackendFieldNames.SYSTEM_START_TIME,
    [SystemUIFieldNames.LOCKED_STATUS]: SystemBackendFieldNames.LOCKED_STATUS,
};

export const SystemFields: Record<string, QBField> = {
    ID: {
        label: 'Minion ID',
        dataField: SystemUIFieldNames.ID,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    ALIAS: {
        label: 'Alias',
        dataField: SystemUIFieldNames.ALIAS,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    WORKSPACE: {
        label: 'Workspace',
        dataField: SystemUIFieldNames.WORKSPACE,
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
        dataField: SystemUIFieldNames.CONNECTION_STATUS,
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
        dataField: SystemUIFieldNames.MODEL,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    VENDOR: {
        label: 'Vendor',
        dataField: SystemUIFieldNames.VENDOR,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    OS_FULL_NAME: {
        label: 'Operating system',
        dataField: SystemUIFieldNames.OS_FULL_NAME,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    SCAN_CODE: {
        label: 'Scan code',
        dataField: SystemUIFieldNames.SCAN_CODE,
        filterOperations: [
            QueryBuilderOperations.EQUALS.name,
            QueryBuilderOperations.DOES_NOT_EQUAL.name,
        ],
    },
    LOCKED_STATUS: {
        label: 'Locked status',
        dataField: SystemUIFieldNames.LOCKED_STATUS,
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
