export const TAKE_LIMIT = 10000;

export const takeErrorMessages = {
  greaterOrEqualToZero: 'Enter a value greater than or equal to 0',
  lessOrEqualToTenThousand: `Enter a value less than or equal to ${TAKE_LIMIT.toLocaleString()}`,
};

export const labels = {
  outputType: 'Output',
  types: 'Type',
  queryBy: 'Query By',
  orderBy: 'OrderBy',
  descending: 'Descending',
  take: 'Take',
};

export const tooltips = {
  outputType: 'Select whether to return work item properties or only total count.',
  types: 'Choose one or more work item types to query.',
  filter: 'Filter work items by property. Use Grafana template variables or the dashboard time range in date filters.',
  orderBy: 'Select which property to sort by for properties output.',
  descending: 'Toggle descending sort order for properties output.',
  take: `Set the maximum number of work items to return. Maximum is ${TAKE_LIMIT.toLocaleString()}.`,
};
