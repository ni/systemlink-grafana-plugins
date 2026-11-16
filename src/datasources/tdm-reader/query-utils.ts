import { MOCK_TDM_FILES } from './mock-data';
import { MockTdmFile, TdmCondition, TdmFilter, TdmLogicalOperator } from './types';

type FilePredicate = (file: MockTdmFile) => boolean;

interface ParsedFilter {
  filter: TdmFilter;
  predicate: FilePredicate;
  empty: boolean;
}

export interface FileFilterState {
  filter: TdmFilter;
  files: MockTdmFile[];
  empty: boolean;
  error?: string;
}

function parseFilter(value: unknown, depth = 0): ParsedFilter {
  if (!Array.isArray(value) || depth > 20) {
    throw new Error('Invalid file filter: expected a query-builder condition or group.');
  }
  if (value.length === 0) {
    return { filter: [], predicate: () => false, empty: true };
  }
  if (typeof value[0] === 'string' && value[0] !== 'and' && value[0] !== 'or') {
    const [field, operator, operand] = value;
    if (
      value.length !== 3 ||
      (field !== 'fileId' && field !== 'fileName') ||
      (operator !== '=' && operator !== '<>') ||
      (field === 'fileId' && operator !== '=') ||
      typeof operand !== 'string'
    ) {
      throw new Error('Invalid file condition. File ID supports Equals; File Name supports Equals and Does not equal.');
    }
    const condition: TdmCondition = [field, operator, operand];
    return {
      filter: [condition],
      predicate: file => operator === '=' ? file[field] === operand : file[field] !== operand,
      empty: false,
    };
  }
  if (value.length % 2 === 0) {
    throw new Error('Invalid file filter: conditions must be separated by a logical operator.');
  }
  const children: ParsedFilter[] = [];
  const operators: TdmLogicalOperator[] = [];
  const filter: TdmFilter = [];
  for (let index = 0; index < value.length; index++) {
    if (index % 2 === 0) {
      const child = parseFilter(value[index], depth + 1);
      children.push(child);
      filter.push(child.filter.length === 1 ? child.filter[0] : child.filter);
    } else {
      const operator: unknown = value[index];
      if (operator !== 'and' && operator !== 'or' && operator !== 'notand' && operator !== 'notor') {
        throw new Error('Invalid file filter: unsupported logical operator.');
      }
      operators.push(operator);
      filter.push(operator);
    }
  }
  if (children.every(child => child.empty) && children.length === 1) {
    return { filter, predicate: () => false, empty: true };
  }
  if (children.some(child => child.empty)) {
    throw new Error('Complete or remove empty groups in the file filter.');
  }
  const negatedOperator = operators.find(operator => operator === 'notand' || operator === 'notor');
  if (negatedOperator && operators.some(operator => operator !== negatedOperator)) {
    throw new Error('Invalid file filter: a negated group must use a single logical operator.');
  }
  return {
    filter,
    empty: false,
    predicate: file => {
      if (negatedOperator) {
        return negatedOperator === 'notand'
          ? !children.every(child => child.predicate(file))
          : !children.some(child => child.predicate(file));
      }
      let conjunction = children[0].predicate(file);
      let result = false;
      operators.forEach((operator, index) => {
        const next = children[index + 1].predicate(file);
        if (operator === 'and') {
          conjunction = conjunction && next;
        } else {
          result = result || conjunction;
          conjunction = next;
        }
      });
      return result || conjunction;
    },
  };
}

export function getFileFilterState(value: unknown): FileFilterState {
  try {
    const parsed = parseFilter(value ?? []);
    return {
      filter: parsed.filter,
      files: parsed.empty ? [] : MOCK_TDM_FILES.filter(parsed.predicate),
      empty: parsed.empty,
    };
  } catch (error) {
    return {
      filter: [],
      files: [],
      empty: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function retainChannelSelection(selectedIds: readonly string[], availableIds: readonly string[]): string[] {
  const available = new Set(availableIds);
  return [...new Set(selectedIds)].filter(id => available.has(id));
}
