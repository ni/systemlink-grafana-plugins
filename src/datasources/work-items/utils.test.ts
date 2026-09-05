import { TAKE_LIMIT } from './constants';
import { takeErrorMessages } from './constants/QueryEditor.constants';
import { WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';
import { getTakeError, isPropertiesNonEmpty, isTakeValid, isTypesNonEmpty } from './utils';

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
