import _ from 'lodash';

// Template literal tag function to replace spaces with non-breaking spaces
export const nbsp = (strings: TemplateStringsArray, ...values: string[]) =>
  _.flatten(_.zip(strings, values)).join('').replace(/ /g, '\u00a0');

export const isValidId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export function areKeyValueArraysEqual<T extends Record<string, any>>(
  firstArray: T[],
  secondArray: T[],
  keyProperty = 'name',
  valueProperty = 'value'
): boolean {
  if (firstArray.length !== secondArray.length) {
    return false;
  }
  return firstArray.every((item, index) =>
    item?.[keyProperty] === secondArray[index]?.[keyProperty] &&
    item?.[valueProperty] === secondArray[index]?.[valueProperty]
  );
}
