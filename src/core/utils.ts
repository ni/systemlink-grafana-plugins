import { SelectableValue, textUtil } from '@grafana/data';
import { useAsync } from 'react-use';
import { DataSourceBase } from './DataSourceBase';
import { BatchQueryConfig, QueryResponse, SystemLinkError, Workspace } from './types';
import { TemplateSrv } from '@grafana/runtime';
import { QueryBuilderOperations } from './query-builder.constants';
import { ExpressionTransformFunction } from './query-builder.utils';

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
    workspaceOptions?.unshift(...getVariableOptions(datasource));
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
      const variableReplacedValues = templateSrv
        .replace(value) // Replace variable with their values
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
    .replace(/ &lt; /g, ' < ')
    .replace(/ &lt;= /g, ' <= ')
    .replace(/ &gt; /g, ' > ')
    .replace(/ &gt;= /g, ' >= ')
    .replace(/ &amp;&amp; /g, ' && ')
    .replace(/ &lt;&gt; /g, ' <> ');
}

export function validateNumericInput(event: React.KeyboardEvent<HTMLInputElement>) {
  if (isNaN(Number(event.key)) && !['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
  }
}

export async function queryInBatches<T>(
  queryRecord: (take: number, continuationToken?: string) => Promise<QueryResponse<T>>,
  queryConfig: BatchQueryConfig,
  take?: number
): Promise<QueryResponse<T>> {
  if (take === undefined || take <= queryConfig.maxTakePerRequest) {
    return await queryRecord(take || queryConfig.maxTakePerRequest);
  }

  let queryResponse: T[] = [];
  let continuationToken: string | undefined;
  let totalCount: number | undefined;

  const getRecords = async (currentRecordCount: number): Promise<void> => {
    const response = await queryRecord(currentRecordCount, continuationToken);
    queryResponse.push(...response.data);
    continuationToken = response.continuationToken;
    totalCount = response.totalCount ?? totalCount;
  };

  const queryRecordsInCurrentBatch = async (): Promise<void> => {
    const remainingRecordsToGet =
      totalCount !== undefined
        ? Math.min(take - queryResponse.length, totalCount - queryResponse.length)
        : take - queryResponse.length;

    if (remainingRecordsToGet <= 0) {
      return;
    }

    const currentRecordCount = Math.min(queryConfig.maxTakePerRequest, remainingRecordsToGet);
    await getRecords(currentRecordCount);
  };

  const queryCurrentBatch = async (requestsInCurrentBatch: number): Promise<void> => {
    for (let request = 0; request < requestsInCurrentBatch; request++) {
      await queryRecordsInCurrentBatch();
    }
  };

  while (queryResponse.length < take && (totalCount === undefined || queryResponse.length < totalCount)) {
    const remainingRequestCount = Math.ceil((take - queryResponse.length) / queryConfig.maxTakePerRequest);
    const requestsInCurrentBatch = Math.min(queryConfig.requestsPerSecond, remainingRequestCount);

    const startTime = Date.now();
    await queryCurrentBatch(requestsInCurrentBatch);
    const elapsedTime = Date.now() - startTime;

    if (queryResponse.length <= take && continuationToken && elapsedTime < 1000) {
      await delay(1000 - elapsedTime);
    }
  }

  return {
    data: queryResponse,
    totalCount,
  };
}

/**
 * The function checks if the provided value is a multi-select value. If it is, it generates
 * a query expression that combines all values using the specified operation and a logical
 * operator (e.g., AND/OR). If the value is not a multi-select, it generates a simple query
 * expression for the single value.
 */
export function multipleValuesQuery(field: string): ExpressionTransformFunction {
  return (value: string, operation: string, _options?: any) => {
    const isMultiSelect = isMultiSelectValue(value);
    const valuesArray = getMultipleValuesArray(value);
    const logicalOperator = getLogicalOperator(operation);

    return isMultiSelect
      ? `(${valuesArray.map(val => `${field} ${operation} "${val}"`).join(` ${logicalOperator} `)})`
      : `${field} ${operation} "${value}"`;
  };
}

/**
 * Creates a function that generates a query expression for a given field, 
 * applying a specified operation and value. The value is formatted to ISO 
 * string format if it matches the placeholder '${__now:date}'.
 */
export function timeFieldsQuery(field: string): ExpressionTransformFunction {
  return (value: string, operation: string): string => {
    const formattedValue = value === '${__now:date}' ? new Date().toISOString() : value;
    return `${field} ${operation} "${formattedValue}"`;
  };
}

function isMultiSelectValue(value: string): boolean {
  return value.startsWith('{') && value.endsWith('}');
}

function getMultipleValuesArray(value: string): string[] {
  return value.replace(/({|})/g, '').split(',');
}

function getLogicalOperator(operation: string): string {
  return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
}

async function delay(timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}
