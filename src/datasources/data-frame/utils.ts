import _ from 'lodash';

// Template literal tag function to replace spaces with non-breaking spaces
export const nbsp = (strings: TemplateStringsArray, ...values: string[]) =>
  _.flatten(_.zip(strings, values)).join('').replace(/ /g, '\u00a0');

export const isValidId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export function areObjectsEqual<T extends Record<string, any>>(
  first: T,
  second: T
): boolean {
  return _.isEqual(first, second);
}
