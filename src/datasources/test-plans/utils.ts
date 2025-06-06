import { TimeFields } from "./types";

export function isTimeField(field: string): boolean {
    return field === TimeFields.CREATED_AT
        || field === TimeFields.UPDATED_AT
        || field === TimeFields.PLANNED_START_DATE_TIME
        || field === TimeFields.ESTIMATED_END_DATE_TIME;
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
