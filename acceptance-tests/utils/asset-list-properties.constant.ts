export const defaultAssetListProperties = [
    'vendor name',
    'name',
    'model name',
    'workspace',
    'location'
] as const;

export const nonDefaultAssetListProperties = [
    'id',
    'serial number',
    'model number',
    'vendor number',
    'asset type',
    'firmware version',
    'visa resource name',
    'part number',
    'last updated timestamp',
    'bus type',
    'is NI asset',
    'keywords',
    'properties',
    'minionId',
    'parent name',
    'supports self calibration',
    'supports self test',
    'supports reset',
    'discovery type',
    'self calibration',
    'supports external calibration',
    'calibration due date',
    'is system controller',
    'calibration status',
    'scan code'
] as const;
