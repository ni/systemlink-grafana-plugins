import _ from 'lodash';

// Template literal tag function to replace spaces with non-breaking spaces
export const nbsp = (strings: TemplateStringsArray, ...values: string[]) =>
  _.flatten(_.zip(strings, values)).join('').replace(/ /g, '\u00a0');

export const isValidId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

/**
 * Generic shallow equality check for two arrays of objects using provided key & value property names.
 * Order sensitive: arrays must have identical length and matching entries at each index.
 * Strict (===) comparison on both key and value properties.
 */
export function areKeyValueArraysEqual<T extends Record<string, any>>(
  firstArray: T[],
  secondArray: T[],
  keyProperty = 'name',
  valueProperty = 'value'
): boolean {
  if (firstArray.length !== secondArray.length) {
    return false;
  }
  for (let i = 0; i < firstArray.length; i++) {
    if (
      firstArray[i]?.[keyProperty] !== secondArray[i]?.[keyProperty] ||
      firstArray[i]?.[valueProperty] !== secondArray[i]?.[valueProperty]
    ) {
      return false;
    }
  }
  return true;
}
