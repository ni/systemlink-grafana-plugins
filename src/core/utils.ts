import { SelectableValue, textUtil } from '@grafana/data';
import { useAsync } from 'react-use';
import { DataSourceBase } from './DataSourceBase';
import { SystemLinkError, Workspace } from './types';
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
export function useWorkspaceOptions<DSType extends DataSourceBase<any, any>>(datasource: DSType) {
  return useAsync(async () => {
    const workspaces = await datasource.getWorkspaces();
    const workspaceOptions = workspaces.map(w => ({ label: w.name, value: w.id }));
    workspaceOptions?.unshift(...getVariableOptions(datasource))
    return workspaceOptions;
  });
}

/** Gets Dashboard variables as an array of {@link SelectableValue}. */
export function getVariableOptions<DSType extends DataSourceBase<any, any>>(datasource: DSType) {
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
  values.forEach(value => {
    if (templateSrv.containsTemplate(value)) {
      const variableReplacedValues = templateSrv.replace(value) // Replace variable with their values
        .replace(/[{}]/g, '') // return values without curly braces for multi-value variables which are returned as {value1,value2}
        .split(',');
      replaced.push(...variableReplacedValues.filter(v => v.trim() !== ''));
    } else {
      replaced.push(value);
    }
  });
  // Dedupe and flatten
  return [...new Set(replaced.flat())];
}

export function isSystemLinkError(error: any): error is SystemLinkError {
  return Boolean(error?.error?.code) && Boolean(error?.error?.name);
}


/**
 * Used for filtering XSS in query builder fields
 */
export function filterXSSField({ label, value }: { label: string; value: string }) {
  return { label: textUtil.sanitize(label), value: textUtil.sanitize(value) };
}

/**
 * Used for filtering XSS strings in LINQ expression
 */
export function filterXSSLINQExpression(value: string | null | undefined): string {
  const unsanitizedTarget = value ?? '';
  const sanitizedTarget = textUtil.sanitize(unsanitizedTarget);

  return sanitizedTarget
    .replace(/ &lt; /g, " < ")
    .replace(/ &lt;= /g, " <= ")
    .replace(/ &gt; /g, " > ")
    .replace(/ &gt;= /g, " >= ")
    .replace(/ &amp;&amp; /g, " && ")
    .replace(/ &lt;&gt; /g, " <> ");
}

export function validateNumericInput(event: React.KeyboardEvent<HTMLInputElement>) {
  if (isNaN(Number(event.key)) && !['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
  }
}
