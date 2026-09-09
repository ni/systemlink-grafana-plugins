import { CUSTOM_PROPERTY_SUFFIX, TAKE_LIMIT } from './constants';
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
    properties?: WorkItemPropertiesOptions[],
    customProperties?: string[]
): boolean =>
  Boolean(
    (properties && properties.length > 0) || 
    (customProperties && customProperties.length > 0)
  );

export const stripCustomPropertySuffix = (value: string): string =>
  value.endsWith(
    CUSTOM_PROPERTY_SUFFIX
  ) ? value.slice(0, -CUSTOM_PROPERTY_SUFFIX.length) : value;
