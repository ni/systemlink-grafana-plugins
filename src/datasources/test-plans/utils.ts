import { TestPlansQueryBuilderFieldNames } from "./constants/TestPlansQueryBuilder.constants";

export function isTimeField(
    queryBuilderFieldName: TestPlansQueryBuilderFieldNames
): boolean {
    return (
        queryBuilderFieldName === TestPlansQueryBuilderFieldNames.CreatedAt
        || queryBuilderFieldName === TestPlansQueryBuilderFieldNames.UpdatedAt
        || queryBuilderFieldName === TestPlansQueryBuilderFieldNames.PlannedStartDate
        || queryBuilderFieldName === TestPlansQueryBuilderFieldNames.EstimatedEndDate
    );
}

export const transformDuration = (totalSeconds: number): string => {
    const timeUnits = [
        { label: 'day', secondsInUnit: 86400 },
        { label: 'hr', secondsInUnit: 3600 },
        { label: 'min', secondsInUnit: 60 },
        { label: 'sec', secondsInUnit: 1 },
    ];

    const parts: string[] = [];

    for (const { label, secondsInUnit } of timeUnits) {
        const count = Math.floor(totalSeconds / secondsInUnit);
        if (count > 0) {
            parts.push(`${count} ${label}${count > 1 ? 's' : ''}`);
            totalSeconds %= secondsInUnit;
        }
    }

    return parts.length > 0 ? parts.join(', ') : '0 sec';
};
