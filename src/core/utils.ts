import { SelectableValue, textUtil } from '@grafana/data';
import { useAsync } from 'react-use';
import { DataSourceBase } from './DataSourceBase';
import { BatchQueryConfig, QBField, QueryBuilderOption, QueryResponse, SystemLinkError, Workspace } from './types';
import { BackendSrv, BackendSrvRequest, FetchError, isFetchError, TemplateSrv } from '@grafana/runtime';
import { catchError, delayWhen, lastValueFrom, map, mergeMap, Observable, of, throwError, timer } from 'rxjs';

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
    .map(variable => ({ label: '$' + variable.name, value: '$' + variable.name }));
}

export function getWorkspaceName(workspaces: Workspace[], id: string) {
  return workspaces.find(w => w.id === id)?.name ?? id;
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

export async function queryInBatches<T>(
  queryRecord: (take: number, continuationToken?: string) => Promise<QueryResponse<T>>,
  queryConfig: BatchQueryConfig,
  take?: number,
): Promise<QueryResponse<T>> {
  if (take === undefined || take <= queryConfig.maxTakePerRequest) {
    return await queryRecord(take ?? queryConfig.maxTakePerRequest);
  }

  let queryResponse: T[] = [];
  let continuationToken: string | undefined;
  let responseLength = 0;
  let recordCount = 0;

  const getRecords = async (currentRecordCount: number): Promise<void> => {
    const response = await queryRecord(currentRecordCount, continuationToken);
    responseLength = response.data.length;
    queryResponse.push(...response.data);
    continuationToken = response.continuationToken;
  };

  const queryRecordsInCurrentBatch = async (): Promise<void> => {
    if (responseLength < recordCount || continuationToken === null) {
      return;
    }

    recordCount = Math.min(take - queryResponse.length, queryConfig.maxTakePerRequest);
    await getRecords(recordCount);
  };

  const queryCurrentBatch = async (requestsInCurrentBatch: number): Promise<void> => {
    for (let request = 0; request < requestsInCurrentBatch; request++) {
      await queryRecordsInCurrentBatch();
    }
  };

  while (queryResponse.length < take && responseLength === recordCount && continuationToken !== null) {
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
    data: queryResponse
  };
}

/**
 * Executes a query function repeatedly until continuation token is null i.e. all data is retrieved, adhering to the specified
 * batch query configuration for maximum requests per second and items per request.
 *
 * @template T - The type of the data being queried.
 * @param queryRecord - A function that performs the query. It takes the maximum number of items
 *                      to retrieve (`take`) and an optional continuation token, and returns a
 *                      promise that resolves to a `QueryResponse<T>`.
 * @param config - The batch query configuration, including:
 *   - `maxTakePerRequest`: The maximum number of items to retrieve per request.
 *   - `requestsPerSecond`: The maximum number of requests to make per second.
 * @returns A promise that containing all retrieved data
 */
export async function queryUntilComplete<T>(
  queryRecord: (take: number, continuationToken?: string) => Promise<QueryResponse<T>>,
  { maxTakePerRequest, requestsPerSecond }: BatchQueryConfig
): Promise<QueryResponse<T>> {
  const data: T[] = [];
  let continuationToken: string | undefined;

  do {
    const start = Date.now();
    for (let i = 0; i < requestsPerSecond; i++) {
      try {
        const response: QueryResponse<T> = await queryRecord(maxTakePerRequest, continuationToken);
        data.push(...response.data);
        continuationToken = response.continuationToken;

        if (!continuationToken) {
          break;
        }
      } catch (error) {
        throw error; // Re-throw the error to be handled by the caller
      }
    }
    const elapsed = Date.now() - start;
    if (continuationToken && elapsed < 1000) {
      await delay(1000 - elapsed);
    }
  } while (continuationToken);

  return { data };
}

/**
 * Executes a query function repeatedly until the response length < maxTakePerRequest i.e. all data is retrieved, adhering to the specified
 * batch query configuration for maximum requests per second and items per request.
 * 
 * Note: This method should strictly be used with SLE APIs that require or support a skip parameter.
 * 
 * @param queryRecord - A function that performs the query. It takes the maximum number of items
 *                      to retrieve (`take`) and an optional continuation token, and returns a
 *                      promise that resolves to a `QueryResponse<T>`.
 * @param config - The batch query configuration, including:
 *   - `maxTakePerRequest`: The maximum number of items to retrieve per request.
 *   - `requestsPerSecond`: The maximum number of requests to make per second.
 * @returns A promise that containing all retrieved data
 */
export async function queryUsingSkip<T>(
  queryRecord: (take: number, skip: number) => Promise<QueryResponse<T>>,
  { maxTakePerRequest, requestsPerSecond }: BatchQueryConfig
): Promise<QueryResponse<T>> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  let skip = 0;
  const data: T[] = [];
  let hasMore = true;

  do {
    const start = Date.now();

    for (let i = 0; i < requestsPerSecond && hasMore; i++) {
      const response = await queryRecord(maxTakePerRequest, skip);
      data.push(...response.data);

      if (response.data.length < maxTakePerRequest) {
        hasMore = false;
        break;
      }

      skip += maxTakePerRequest;
    }

    const elapsed = Date.now() - start;
    if (hasMore && elapsed < 1000) {
      await delay(1000 - elapsed);
    }
  } while (hasMore);

  return {
    data,
    totalCount: data.length,
  };
}

/**
 * Sends a GET request to the specified URL with the provided parameters.
 *
 * @template T - The expected response type.
 * @param backendSrv - The Backend Service instance {@link BackendSrv} used to make the request.
 * @param url - The endpoint URL to which the GET request is sent.
 * @param params - The query parameters to be included in the request.
 * @returns A promise resolving to the response of type `T`.
 */
export function get<T>(backendSrv: BackendSrv, url: string, params?: Record<string, any>) {
  return fetch<T>(backendSrv, { method: 'GET', url, params });
}

/**
 * Sends a POST request to the specified URL with the provided request body and options.
 *
 * @template T - The expected response type.
 * @param backendSrv - The Backend Service instance {@link BackendSrv} used to make the request.
 * @param url - The endpoint URL to which the POST request is sent.
 * @param body - The request payload as a key-value map.
 * @param options - Optional configuration for the request. This can include:
 *   - `showingErrorAlert` (boolean): If true, displays an error alert on request failure.
 *   - Any other properties supported by {@link BackendSrvRequest}, such as headers, credentials, etc.
 * @returns A promise resolving to the response of type `T`.
 */
export function post<T>(backendSrv: BackendSrv, url: string, body: Record<string, any>, options: Partial<BackendSrvRequest> = {}) {
  return fetch<T>(backendSrv, { method: 'POST', url, data: body, ...options });
}


export const addOptionsToLookup = (field: QBField, options: QueryBuilderOption[]) => {
  return {
    ...field,
    lookup: {
      ...field.lookup,
      dataSource: [
        ...(field.lookup?.dataSource || []),
        ...options,
      ],
    },
  };
};

async function delay(timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

async function fetch<T>(backendSrv: BackendSrv, options: BackendSrvRequest, retries = 0): Promise<T> {
  // URL is stored and reused for each retry to ensure consistency
  // and prevent accidental URL changes during retries
  const url = options.url;

  try {
    return (await lastValueFrom(backendSrv.fetch<T>(options))).data;
  } catch (error) {
    if (isFetchError(error) && error.status === 429 && retries < 3) {
      await delay(Math.random() * 1000 * 2 ** retries);
      return fetch(backendSrv, { ...options, url }, retries + 1);
    }
    if (isFetchError(error)) {
      const fetchError = error as FetchError;
      const statusCode = fetchError.status;
      const genericErrorMessage = `Request to url "${options.url}" failed with status code: ${statusCode}.`;
      if (statusCode === 504) {
        throw new Error(genericErrorMessage);
      } else {
        const data = fetchError.data;
        const errorMessage = data.error?.message || JSON.stringify(data);
        throw new Error(`${genericErrorMessage} Error message: ${errorMessage}`);
      }
    }
    throw error;
  }
}

export function fetchDataAsObservable<T>(
  backendSrv: BackendSrv,
  options: BackendSrvRequest,
  retries = 0
): Observable<T> {
  const url = options.url;
  const maxRetries = 3;

  return backendSrv.fetch<T>(options).pipe(
    map((response) => response.data),
    catchError((error) => {
      if (isFetchError(error) && error.status === 429 && retries < maxRetries) {
        const delayMs = Math.random() * 1000 * 2 ** retries;
        return timer(delayMs).pipe(
          mergeMap(() => fetchDataAsObservable<T>(backendSrv, { ...options, url }, retries + 1))
        );
      }

      if (isFetchError(error)) {
        const fetchError = error as FetchError;
        const statusCode = fetchError.status;
        const genericErrorMessage = `Request to url "${url}" failed with status code: ${statusCode}.`;

        if (statusCode === 504) {
          return throwError(() => new Error(genericErrorMessage));
        } else {
          const data = fetchError.data;
          const errorMessage = data?.error?.message || JSON.stringify(data);
          return throwError(
            () => new Error(`${genericErrorMessage} Error message: ${errorMessage}`)
          );
        }
      }

      return throwError(() => error);
    })
  );
}
