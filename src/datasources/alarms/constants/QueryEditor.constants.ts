export const TAKE_LIMIT = 10000;

export const tooltips = {
    queryBy: 'This optional field specifies the query filters.',
    outputType: 'This field specifies the output type to fetch alarm properties or total count.',
    properties: 'This field specifies the properties to use in the query.',
    orderBy: 'This field specifies the query order of the alarms.',
    descending: 'This toggle returns the alarms query in descending order.',
    take: 'This field specifies the maximum number of alarms to return.'
};

export const takeErrorMessages = {
    greaterOrEqualToZero: 'Enter a value greater than or equal to 0',
    lessOrEqualToTenThousand: 'Enter a value less than or equal to 10,000',
};
