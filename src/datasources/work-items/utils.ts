import { TAKE_LIMIT } from './constants';
import { takeErrorMessages } from './constants/QueryEditor.constants';
import { WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';

export const getTakeError = (take?: number): string => {
  if (take === undefined) {
    return '';
  }

  if (Number.isNaN(take) || take <= 0) {
    return takeErrorMessages.greaterOrEqualToZero;
  }

  if (take > TAKE_LIMIT) {
    return takeErrorMessages.lessOrEqualToTenThousand;
  }

  return '';
};

export const isTypesNonEmpty = (
    types?: WorkItemTypeOptions[]
): boolean => 
    Boolean(types && types.length > 0);

export const isPropertiesNonEmpty = (
    properties?: WorkItemPropertiesOptions[]
): boolean =>
  Boolean(properties && properties.length > 0);

export const isTakeValid = (take?: number): boolean => {
  if (
    take === undefined ||
    Number.isNaN(take) ||
    take <= 0 ||
    take > TAKE_LIMIT
  ) {
    return false;
  }

  return true;
};

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
