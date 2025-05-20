import { TimeFields } from "./types";

export function isTimeField(field: string): boolean {
    return field === TimeFields.CREATED_AT
        || field === TimeFields.UPDATED_AT
        || field === TimeFields.PLANNED_START_DATE_TIME
        || field === TimeFields.ESTIMATED_END_DATE_TIME;
}

export function toCamelCase(input: string): string {
    const words = input.toLowerCase().split('_');
    return words[0] + words
        .slice(1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

export function formatDuration(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;

    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;

    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    const parts: string[] = [];
    if (days > 0) {
        parts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
        parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
    }
    if (seconds > 0) {
        parts.push(`${seconds} sec${seconds > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
}
