import { Properties } from "./types";

export function isTimeField(field: string): boolean {
    return field === Properties.CREATED_AT
        || field === Properties.UPDATED_AT
        || field === Properties.PLANNED_START_DATE_TIME
        || field === Properties.ESTIMATED_END_DATE_TIME
        || field === Properties.CREATED_AT
        || field === Properties.UPDATED_AT
        || field === Properties.PLANNED_START_DATE_TIME;
}

export function toCamelCase(input: string): string {
    const words = input.toLowerCase().split('_');
    return words[0] + words
        .slice(1)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}
