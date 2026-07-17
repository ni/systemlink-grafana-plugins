import { WorkItemsQueryBuilderFieldNames } from './constants/WorkItemsQueryBuilder.constants';

export function isTimeField(fieldName: string): boolean {
  return (
    fieldName === WorkItemsQueryBuilderFieldNames.CreatedAt ||
    fieldName === WorkItemsQueryBuilderFieldNames.UpdatedAt ||
    fieldName === WorkItemsQueryBuilderFieldNames.EarliestStartDateTime ||
    fieldName === WorkItemsQueryBuilderFieldNames.DueDateTime ||
    fieldName === WorkItemsQueryBuilderFieldNames.PlannedStartDateTime ||
    fieldName === WorkItemsQueryBuilderFieldNames.PlannedEndDateTime
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
  let remaining = totalSeconds;

  for (const { label, secondsInUnit } of timeUnits) {
    const count = Math.floor(remaining / secondsInUnit);
    if (count > 0) {
      parts.push(`${count} ${label}${count > 1 ? 's' : ''}`);
      remaining %= secondsInUnit;
    }
  }

  return parts.length > 0 ? parts.join(', ') : '0 secs';
};
