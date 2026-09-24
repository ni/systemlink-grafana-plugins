export const TAKE_LIMIT = 10000;

export const tooltips = {
    queryBy: 'This optional field specifies the query filters.',
    outputType: 'This field specifies the output type to fetch work order properties or total count.',
    properties: 'This field specifies the properties to use in the query.',
    orderBy: 'This field specifies the query order of the work orders.',
    descending: 'This toggle returns the work orders query in descending order.',
    take: 'This field specifies the maximum number of work orders to return.'
};

export const takeErrorMessages = {
    greaterOrEqualToZero: 'Enter a value greater than or equal to 0',
    lessOrEqualToTenThousand: 'Enter a value less than or equal to 10,000',
};

export const deprecationMessage = {
    title: 'Data source deprecated',
    message:
        'The SystemLink Work Orders data source is deprecated and will soon be removed. Please use the SystemLink Work Items data source instead. It supports work orders along with all other work item types.',
    // TODO [Task 4073979]: Append ' For more information, refer to ' to the message and restore the link
    // once the public Work Items documentation is available.
    // linkText: 'Creating a Work Item',
    // linkUrl: '',
};

export const DEPRECATION_NOTICE_MAX_WIDTH = 1104;
