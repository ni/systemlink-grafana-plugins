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
