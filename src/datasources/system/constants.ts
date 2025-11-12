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
  STATE: 'state',
  LOCKED: 'locked',
  SYSTEM_START_TIME: 'systemStartTime',
  MODEL: 'model',
  VENDOR: 'vendor',
  OS_FULL_NAME: 'osFullName',
  IP4_INTERFACES: 'ip4Interfaces',
  IP6_INTERFACES: 'ip6Interfaces',
  WORKSPACE: 'workspace',
  SCAN_CODE: 'scanCode',
} as const;

