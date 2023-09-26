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
];

export const defaultOrderBy = 'createdTimeStamp DESC';
