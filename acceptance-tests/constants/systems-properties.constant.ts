export enum systemsColumn {
    id = 'id',
    alias = 'alias',
    connection_status = 'connection status',
    locked_status = 'locked status',
    system_start_time = 'system start time',
    model = 'model',
    vendor = 'vendor',
    operating_system = 'operating system',
    ip_address = 'ip address',
    workspace = 'workspace',
    scan_code = 'scan code',
}

export const fieldsWithGetByTestIdSelectorForSystemsQueryEditor = ['Alias', 'Locked status', 'Model', 'Operating system', 'Scan code', 'Vendor', 'Workspace'];
export const getByLabelSelectorFieldsForSystemsQueryEditor = ['Connection status', 'Minion ID'];