export const TAKE_LIMIT = 10000;

export const tooltips = {
  queryBy: 'This optional field specifies the query filters.',
  outputType: 'This field specifies the output type to fetch work item properties or total count.',
  properties: 'This field specifies the properties to include in the output.',
  type: 'This field specifies the work item types to fetch.',
  orderBy: 'This field specifies the query order of the work items.',
  descending: 'This toggle returns the work items in descending order.',
  take: 'This field specifies the maximum number of work items to return.',
};

export const takeErrorMessages = {
  greaterOrEqualToZero: 'Enter a value greater than or equal to 0',
  lessOrEqualToTenThousand: 'Enter a value less than or equal to 10,000',
};
