import { TimeFields } from "./types";

export function isTimeField(field: string): boolean {
    return field === TimeFields.CREATED_AT
        || field === TimeFields.UPDATED_AT
        || field === TimeFields.PLANNED_START_DATE_TIME
        || field === TimeFields.ESTIMATED_END_DATE_TIME;
}
