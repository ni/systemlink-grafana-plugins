export const TAKE_LIMIT = 10000;

export const recordCountErrorMessages = {
    greaterOrEqualToZero: 'Enter a value greater than or equal to 0',
    lessOrEqualToTenThousand: 'Enter a value less than or equal to 10,000',
};

export const deprecationMessage = {
    title: 'Data source deprecated',
    message:
        'The SystemLink Test Plans data source is deprecated and will soon be removed. Please use the SystemLink Work Items data source instead. It supports test plans along with all other work item types.',
    // TODO [Task 4073979]: Append ' For more information, refer to ' to the message and restore the link
    // once the public Work Items documentation is available.
    // linkText: 'Creating a Work Item',
    // linkUrl: '',
};

/** Ends the banner at the right edge of the OrderBy field. */
export const DEPRECATION_NOTICE_MAX_WIDTH = 1104;
