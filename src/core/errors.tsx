import { isFetchError } from '@grafana/runtime';
import { Alert, AlertVariant } from '@grafana/ui';
import { errorCodes } from '../datasources/data-frame/constants';
import React, { useState, useEffect } from 'react';
import { useTimeoutFn } from 'react-use';
import { isSystemLinkError } from './utils';

type FloatingErrorProps = {
  message?: string;
  innerMessage?: string;
  severity?: AlertVariant;
};

export const FloatingError = ({ message = '', innerMessage = '', severity = 'error' }: FloatingErrorProps) => {
  const [hide, setHide] = useState(false);
  const reset = useTimeoutFn(() => setHide(true), 5000)[2];
  useEffect(() => {
    setHide(false);
    reset();
  }, [message, reset]);

  if (hide || !message) {
    return null;
  }
  return (
    <Alert
      title={message}
      elevated
      style={{ position: 'absolute', top: 0, right: 0, width: '50%' }}
      severity={severity}
      onRemove={() => setHide(true)}
    >
      {innerMessage && <span>{innerMessage}</span>}
    </Alert>
  );
};

export const parseErrorMessage = (error: Error): string | undefined => {
  if (isFetchError(error)) {
    if (isSystemLinkError(error.data)) {
      return errorCodes[error.data.error.code] ?? error.data.error.message;
    }

    return error.data.message || error.statusText;
  }

  return error.message;
};

export const extractErrorInfo = (errorMessage: string): { url: string; statusCode: string; message: string } => {
  const urlMatch = errorMessage.match(/url "([^"]+)"/);
  const statusCodeMatch = errorMessage.match(/status code: (\d+)/);
  const messageMatch = errorMessage.match(/Error message: (.+)$/);

  const url = urlMatch ? urlMatch[1] : '';
  const statusCode = statusCodeMatch ? statusCodeMatch[1] : '';
  //Try to parse the inner message from the error message
  let message = '';
  if (messageMatch) {
    try {
      const parsed = JSON.parse(messageMatch[1]);
      message = parsed?.message || messageMatch[1];
    } catch {
      message = messageMatch[1];
    }
  }

  return {
    url,
    statusCode,
    message,
  };
};

/**
 * Builds the `errorTitle` shown alongside `getQueryBuilderLookupsErrorDescription`.
 * @param context Noun describing what was being queried, e.g. 'work items', 'testplans'.
 */
export const getQueryBuilderLookupsErrorTitle = (context: string): string => `Warning during ${context} query`;

/**
 * Builds the user-facing description shown when query builder lookups (dropdown options) fail.
 * Used by datasources to populate `errorDescription` alongside an `errorTitle`.
 */
export const getQueryBuilderLookupsErrorDescription = (error: unknown): string => {
  const errorDetails = extractErrorInfo((error as Error).message);

  switch (errorDetails.statusCode) {
    case '404':
      return 'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.';
    case '429':
      return 'The query builder lookups failed due to too many requests. Please try again later.';
    case '504':
      return 'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.';
    default:
      return errorDetails.message
        ? `Some values may not be available in the query builder lookups due to the following error: ${errorDetails.message}.`
        : 'Some values may not be available in the query builder lookups due to an unknown error.';
  }
};

/*
 * Builds the message thrown when a data query itself fails.
 */
export const getQueryErrorMessage = (error: unknown, context: string): string => {
  const errorDetails = extractErrorInfo((error as Error).message);

  switch (errorDetails.statusCode) {
    case '':
      return 'The query failed due to an unknown error.';
    case '404':
      return `The query to fetch ${context} failed because the requested resource was not found. Please check the query parameters and try again.`;
    case '429':
      return `The query to fetch ${context} failed due to too many requests. Please try again later.`;
    case '504':
      return `The query to fetch ${context} experienced a timeout error. Narrow your query with a more specific filter and try again.`;
    default:
      return `The query failed due to the following error: (status ${errorDetails.statusCode}) ${errorDetails.message}.`;
  }
};

/**
 * Builds the `errorTitle`/`errorDescription` pair for a failed query builder lookup in one call.
 * @param error The caught error.
 * @param context Noun describing what was being queried, e.g. 'work items', 'testplans'.
 */
export const getQueryBuilderLookupsError = (
  error: unknown,
  context: string
): { title: string; description: string } => ({
  title: getQueryBuilderLookupsErrorTitle(context),
  description: getQueryBuilderLookupsErrorDescription(error),
});
