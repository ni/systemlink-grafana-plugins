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

export const systemFields = {
  ID: 'id',
  ALIAS: 'alias',
  SCAN_CODE: 'scanCode',
} as const;

export enum AllFieldNames {
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

