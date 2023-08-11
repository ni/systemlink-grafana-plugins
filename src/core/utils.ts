import { SelectableValue } from '@grafana/data';

export function enumToOptions<T>(stringEnum: { [name: string]: T }): Array<SelectableValue<T>> {
  const RESULT = [];

  for (const [key, value] of Object.entries(stringEnum)) {
    RESULT.push({ label: key, value: value });
  }

  return RESULT;
}

/**
 * Throws an error when called
 * @param error either error object or a string
 */
export const Throw = (error: string | Error): never => {
  if (typeof error === 'string') {
    throw new Error(error);
  }
  throw error;
};

/**
 * Throw exception if value is null or undefined
 * @param value value to be checked for null or undefined
 * @param error either error object or a string
 */
export const throwIfNullish = <T>(value: T, error: string | Error): NonNullable<T> =>
  value === undefined || value === null ? Throw(error) : value!;
