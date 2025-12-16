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

export const errorCodes: { [key: number]: string; } = {
  [-255134]: 'Invalid table ID',
  [-255130]: 'Table does not exist',
};

export const propertiesCacheTTL = 1000 * 60 * 5; // 5 minutes

export const TAKE_LIMIT = 1000;
export const COLUMN_OPTIONS_LIMIT = 10000;
export const COLUMN_SELECTION_LIMIT = 20;
export const TOTAL_ROWS_LIMIT = 1000000;
export const RESULT_IDS_LIMIT = 1000;
export const CUSTOM_PROPERTY_COLUMNS_LIMIT = 10000;

export const REQUESTS_PER_SECOND = 6;
export const DELAY_BETWEEN_REQUESTS_MS = 1000;

export const PART_NUMBER_FIELD = 'partNumber';

export const NUMERIC_DATA_TYPES = [
    'INT32',
    'INT64',
    'FLOAT32',
    'FLOAT64'
];
