import { nbsp } from "./utils";

export const decimationMethods = [
  {
    value: 'LOSSY',
    label: 'Lossy',
    description: nbsp`Completes faster but is less accurate`,
  },
  {
    value: 'MAX_MIN',
    label: 'Max/min',
    description: nbsp`Preserves spikes and dips`,
  },
  {
    value: 'ENTRY_EXIT',
    label: 'Entry/exit',
    description: nbsp`Maintains edges of data (includes max/min)`,
  },
];

export const decimationNoneOption = {
  value: 'NONE',
  label: 'None',
  description: nbsp`No decimation applied`,
};

export const errorCodes: { [key: number]: string; } = {
  [-255134]: 'Invalid table ID',
  [-255130]: 'Table does not exist',
};

export const propertiesCacheTTL = 1000 * 60 * 5; // 5 minutes

export const TAKE_LIMIT = 1000;
export const UNDECIMATED_RECORDS_LIMIT = 1_000_000;
export const COLUMN_OPTIONS_LIMIT = 10000;
export const COLUMN_SELECTION_LIMIT = 20;
export const MAXIMUM_DATA_POINTS = 1000000;
export const RESULT_IDS_LIMIT = 1000;
export const CUSTOM_PROPERTY_COLUMNS_LIMIT = 100;

export const REQUESTS_PER_SECOND = 6;
export const DELAY_BETWEEN_REQUESTS_MS = 1000;

export const PART_NUMBER_FIELD = 'partNumber';

export const INTEGER_DATA_TYPES = ['INT32', 'INT64'];

export const NUMERIC_DATA_TYPES = [
    ...INTEGER_DATA_TYPES,
    'FLOAT32',
    'FLOAT64'
];

export const COLUMNS_GROUP = 'Columns';
export const METADATA_GROUP = 'Metadata';

export const POSSIBLE_UNIT_CUSTOM_PROPERTY_KEYS = ['unit', 'units', 'Unit', 'Units'];

export const X_COLUMN_RANGE_DECIMAL_PRECISION = 6;

export const INT32_MIN = -2_147_483_648;
export const INT32_MAX = 2_147_483_647;

export const INT64_MIN = Number.MIN_SAFE_INTEGER;
export const INT64_MAX = Number.MAX_SAFE_INTEGER;

export const FLOAT32_MIN = -3.402_823_47e38;
export const FLOAT32_MAX = 3.402_823_47e38;

export const FLOAT64_MIN = -Number.MAX_VALUE;
export const FLOAT64_MAX = Number.MAX_VALUE;
