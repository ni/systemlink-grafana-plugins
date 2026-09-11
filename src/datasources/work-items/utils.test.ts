import { CUSTOM_PROPERTY_SUFFIX, TAKE_LIMIT } from './constants';
import { takeErrorMessages } from './constants/QueryEditor.constants';
import { WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';
import { getTakeError, isPropertiesNonEmpty, isTakeValid, isTypesNonEmpty, stripCustomPropertySuffix, transformDuration } from './utils';

describe('getTakeError', () => {
  it('should return no error for a value within the valid range', () => {
    expect(getTakeError(1)).toBe('');
    expect(getTakeError(500)).toBe('');
    expect(getTakeError(TAKE_LIMIT)).toBe('');
  });

  it('should return no error when the value is undefined', () => {
    expect(getTakeError(undefined)).toBe('');
  });

  it('should return the non-positive error for NaN, zero, or negative values', () => {
    expect(getTakeError(NaN)).toBe(takeErrorMessages.greaterOrEqualToZero);
    expect(getTakeError(0)).toBe(takeErrorMessages.greaterOrEqualToZero);
    expect(getTakeError(-5)).toBe(takeErrorMessages.greaterOrEqualToZero);
  });

  it('should return the limit error when the value exceeds the maximum', () => {
    expect(getTakeError(TAKE_LIMIT + 1)).toBe(takeErrorMessages.lessOrEqualToTenThousand);
  });
});

describe('isTypesNonEmpty', () => {
  it('should return true when at least one type is selected', () => {
    expect(isTypesNonEmpty([WorkItemTypeOptions.WorkOrders])).toBe(true);
  });

  it('should return false for an empty or undefined list', () => {
    expect(isTypesNonEmpty([])).toBe(false);
    expect(isTypesNonEmpty(undefined)).toBe(false);
  });
});

describe('isPropertiesNonEmpty', () => {
  it('should return true when at least one property is selected', () => {
    expect(isPropertiesNonEmpty([WorkItemPropertiesOptions.NAME])).toBe(true);
  });

  it('should return false for an empty or undefined list', () => {
    expect(isPropertiesNonEmpty([])).toBe(false);
    expect(isPropertiesNonEmpty(undefined)).toBe(false);
  });

  it('should return true when only custom properties are selected', () => {
    expect(isPropertiesNonEmpty([], ['customProperty1'])).toBe(true);
    expect(isPropertiesNonEmpty(undefined, ['customProperty1'])).toBe(true);
  });

  it('should return false when both standard and custom properties are empty', () => {
    expect(isPropertiesNonEmpty([], [])).toBe(false);
    expect(isPropertiesNonEmpty(undefined, undefined)).toBe(false);
  });
});

describe('stripCustomPropertySuffix', () => {
  it('should remove the custom property suffix from a suffixed value', () => {
    expect(stripCustomPropertySuffix(`customProperty1${CUSTOM_PROPERTY_SUFFIX}`)).toBe('customProperty1');
  });

  it('should return the value unchanged when it has no custom property suffix', () => {
    expect(stripCustomPropertySuffix(WorkItemPropertiesOptions.NAME)).toBe(WorkItemPropertiesOptions.NAME);
  });
});

describe('isTakeValid', () => {
  it('should return true for a value within the valid range', () => {
    expect(isTakeValid(1)).toBe(true);
    expect(isTakeValid(500)).toBe(true);
    expect(isTakeValid(TAKE_LIMIT)).toBe(true);
  });

  it('should return false when the value is undefined', () => {
    expect(isTakeValid(undefined)).toBe(false);
  });

  it('should return false for NaN, zero, or negative values', () => {
    expect(isTakeValid(NaN)).toBe(false);
    expect(isTakeValid(0)).toBe(false);
    expect(isTakeValid(-5)).toBe(false);
  });

  it('should return false when the value exceeds the maximum', () => {
    expect(isTakeValid(TAKE_LIMIT + 1)).toBe(false);
  });
});

test('transformDuration', () => {
    expect(transformDuration(0)).toBe('0 sec');
    expect(transformDuration(61)).toBe('1 min, 1 sec');
    expect(transformDuration(3661)).toBe('1 hr, 1 min, 1 sec');
    expect(transformDuration(90061)).toBe('1 day, 1 hr, 1 min, 1 sec');
    expect(transformDuration(172800)).toBe('2 days');
});
