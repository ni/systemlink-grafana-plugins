import { SelectableValue } from '@grafana/data';
import { useAsync } from 'react-use';
import { DataSourceBase } from './DataSourceBase';
import { Workspace } from './types';
import { TemplateSrv } from '@grafana/runtime';

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
export function Throw(error: string | Error): never {
  if (typeof error === 'string') {
    throw new Error(error);
  }
  throw error;
}

/**
 * Throw exception if value is null or undefined
 * @param value value to be checked for null or undefined
 * @param error either error object or a string
 */
export function throwIfNullish<T>(value: T, error: string | Error): NonNullable<T> {
  return value === undefined || value === null ? Throw(error) : value!;
}

/** Gets available workspaces as an array of {@link SelectableValue}. */
export function useWorkspaceOptions<DSType extends DataSourceBase<any>>(datasource: DSType) {
  return useAsync(async () => {
    const workspaces = await datasource.getWorkspaces();
    const workspaceOptions = workspaces.map(w => ({ label: w.name, value: w.id }));
    workspaceOptions?.unshift(...getVariableOptions(datasource))
    return workspaceOptions;
  });
}

/** Gets Dashboard variables as an array of {@link SelectableValue}. */
export function getVariableOptions<DSType extends DataSourceBase<any>>(datasource: DSType) {
  return datasource.templateSrv
    .getVariables()
    .filter((variable: any) => !variable.datasource || variable.datasource.uid !== datasource.uid)
    .map(variable => ({ label: '$' + variable.name, value: '$' + variable.name }));
}

export function getWorkspaceName(workspaces: Workspace[], id: string) {
  return workspaces.find(w => w.id === id)?.name ?? id;
}

/**
 * Async wrapper for `window.setTimeout`
 * @param timeout the time to sleep in milliseconds
 */
export function sleep(timeout: number) {
  return new Promise(res => window.setTimeout(res, timeout));
}

/**
 * Replace variables in an array of values.
 * Useful for multi-value variables.
 */
export function replaceVariables(values: string[], templateSrv: TemplateSrv) {
  const replaced: string[] = [];
  values.forEach((col: string, index) => {
    let value = col;
    if (templateSrv.containsTemplate(col)) {
      const variables = templateSrv.getVariables() as any[];
      const variable = variables.find(v => v.name === col.split('$')[1]);
      value = variable.current.value;
    }
    replaced.push(value);
  });
  // Dedupe and flatten
  return [...new Set(replaced.flat())];
}

export const expandMultipleValueVariableAfterReplace = (input: string): string[] => {
  // Helper function to recursively generate combinations
  const generateCombinations = (text: string, start = 0): string[] => {
    // Find the next pattern in the string
    const open = text.indexOf('{{', start);
    if (open === -1) {
      // No more patterns, return the current string
      return [text];
    }
    const close = text.indexOf('}}', open);
    if (close === -1) {
      throw new Error('Unmatched braces');
    }

    // Check for nested braces
    const nestedOpen = text.indexOf('{{', open + 1);
    if (nestedOpen !== -1 && nestedOpen < close) {
      throw new Error('Nested braces are not allowed');
    }

    // Extract the options within the braces and generate combinations
    const options = text.substring(open + 2, close).split(',').filter((option) => option !== '');
    const prefix = text.substring(0, open);
    const suffix = text.substring(close + 2);

    let combinations: string[] = [];
    for (const option of options) {
      // For each option, replace the pattern with the option and generate further combinations
      const newCombinations = generateCombinations(prefix + option + suffix);
      combinations = combinations.concat(newCombinations);
    }

    return combinations;
  };

  return generateCombinations(input);
};
