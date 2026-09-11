import { render, screen } from '@testing-library/react'
import { FetchError } from '@grafana/runtime';
import { act } from 'react-dom/test-utils';
import { extractErrorInfo,
   FloatingError, 
   getQueryBuilderLookupsError,
   getQueryError,
   parseErrorMessage 
  } from './errors';
import { SystemLinkError } from "./types";
import React from 'react';
import { errorCodes } from "../datasources/data-frame/constants";
import { AlertVariant } from '@grafana/ui';

test('renders with error message', () => {
  render(<FloatingError message='error msg'/>)

  expect(screen.getByText('error msg')).toBeInTheDocument()
  expect(screen.queryByText('inner msg')).not.toBeInTheDocument()
})

test('renders with inner message', () => {
  render(<FloatingError message='error msg' innerMessage='inner msg'/>)

  expect(screen.getByText('error msg')).toBeInTheDocument()
  expect(screen.getByText('inner msg')).toBeInTheDocument()
})

const severityCases: Array<[AlertVariant]> = [
  ['error'],
  ['warning'],
]
test.each(severityCases)('renders with severity %s', (severity: AlertVariant) => {
  render(<FloatingError message='error msg' severity={severity} />);

  expect(screen.getByText('error msg')).toBeInTheDocument();
  expect(screen.getByRole('alert').children.item(0)).toHaveAttribute('data-testid', `data-testid Alert ${severity}`);
});

test('does not render without error message', () => {
  const { container } = render(<FloatingError message=''/>)

  expect(container.innerHTML).toBeFalsy()
})

test('hides after timeout', () => {
  jest.useFakeTimers();

  const { container } = render(<FloatingError message='error msg'/>)
  act(() => jest.runAllTimers())

  expect(container.innerHTML).toBeFalsy()
})

test('parses error message', () => {
  const errorMock: Error = {
    name: 'error',
    message: 'error message'
  }

  const result = parseErrorMessage(errorMock)

  expect(result).toBe(errorMock.message)
})

test('parses fetch error message', () => {
  const fetchErrorMock: FetchError = {
    status: 404,
    data: { message: 'error message' },
    config: { url: 'URL' }
  }

  const result = parseErrorMessage(fetchErrorMock as any)

  expect(result).toBe(fetchErrorMock.data.message)
})

test('parses fetch error status text', () => {
  const fetchErrorMock: FetchError = {
    status: 404,
    data: {},
    statusText: 'statusText',
    config: { url: 'URL' }
  }

  const result = parseErrorMessage(fetchErrorMock as any)

  expect(result).toBe(fetchErrorMock.statusText)
})

test('parses SystemLink error code', () => {
  const systemLinkError: SystemLinkError = {
    error: {
      name: 'name',
      args: [],
      code: -255130,
      message: 'error message'
    }
  }
  const fetchErrorMock: FetchError = {
    status: 404,
    data: systemLinkError,
    statusText: 'statusText',
    config: { url: 'URL' }
  }

  const result = parseErrorMessage(fetchErrorMock as any)

  expect(result).toBe(errorCodes[fetchErrorMock.data.error.code] ?? fetchErrorMock.data.error.message)
})

test('parses SystemLink error message', () => {
  const systemLinkError: SystemLinkError = {
    error: {
      name: 'name',
      args: [],
      code: 123,
      message: 'error message'
    }
  }
  const fetchErrorMock: FetchError = {
    status: 404,
    data: systemLinkError,
    statusText: 'statusText',
    config: { url: 'URL' }
  }

  const result = parseErrorMessage(fetchErrorMock as any)

  expect(result).toBe(errorCodes[fetchErrorMock.data.error.code] ?? fetchErrorMock.data.error.message)

})

describe('extractErrorInfo', () => {
  test('extractErrorInfo extracts url, statusCode, and message correctly', () => {
    const errorMessage =
      'Request failed with status code: 404, url "https://example.com/api", Error message: Not Found';
    const result = extractErrorInfo(errorMessage);
  
    expect(result.url).toBe('https://example.com/api');
    expect(result.statusCode).toBe('404');
    expect(result.message).toBe('Not Found');
  });

  test('extractErrorInfo extracts inner message from JSON', () => {
    const errorMessage =
      'Request failed with status code: 500, url "https://example.com/api", Error message: {"message": "Internal Server Error"}';
    const result = extractErrorInfo(errorMessage);
  
    expect(result.url).toBe('https://example.com/api');
    expect(result.statusCode).toBe('500');
    expect(result.message).toBe('Internal Server Error');
  });
  
  test('extractErrorInfo returns empty strings if no matches', () => {
    const errorMessage = 'Some unrelated error text';
    const result = extractErrorInfo(errorMessage);
  
    expect(result.url).toBe('');
    expect(result.statusCode).toBe('');
    expect(result.message).toBe('');
  });
});

describe('getQueryBuilderLookupsError', () => {
  test.each([
    {
      scenario: 'a not found response',
      error: 'Request failed with status code: 404',
      expectedMessage:
        'The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.',
    },
    {
      scenario: 'a too many requests response',
      error: 'Request failed with status code: 429',
      expectedMessage: 'The query builder lookups failed due to too many requests. Please try again later.',
    },
    {
      scenario: 'a timeout response',
      error: 'Request failed with status code: 504',
      expectedMessage:
        'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.',
    },
    {
      scenario: 'an unhandled status code that reports a message',
      error: 'Request failed with status code: 500. Error message: Internal Server Error',
      expectedMessage:
        'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.',
    },
    {
      scenario: 'an error without a status code or message',
      error: 'Error',
      expectedMessage: 'Some values may not be available in the query builder lookups due to an unknown error.',
    },
  ])('should build the title and message when $scenario', ({ error, expectedMessage }) => {
    const result = getQueryBuilderLookupsError(new Error(error), 'work items');

    expect(result).toEqual({ title: 'Warning during work items query', message: expectedMessage });
  });

  test.each(['work items', 'workorders', 'testplans', 'alarms', 'dataframe', 'product value'])(
    'should interpolate the %s context into the title',
    (context) => {
      const result = getQueryBuilderLookupsError(new Error('Error'), context);

      expect(result.title).toBe(`Warning during ${context} query`);
    }
  );
});

describe('getQueryError', () => {
  test.each([
    {
      scenario: 'no status code is present',
      error: 'Error',
      expectedMessage: 'The query failed due to an unknown error.',
    },
    {
      scenario: 'a not found response',
      error: 'Request failed with status code: 404',
      expectedMessage:
        'The query to fetch items failed because the requested resource was not found. Please check the query parameters and try again.',
    },
    {
      scenario: 'an unauthorized response',
      error: 'Request failed with status code: 401',
      expectedMessage: 'The query to fetch items failed due to unauthorized access. Please verify your credentials and try again.',
    },
    {
      scenario: 'a too many requests response',
      error: 'Request failed with status code: 429',
      expectedMessage: 'The query to fetch items failed due to too many requests. Please try again later.',
    },
    {
      scenario: 'a timeout response',
      error: 'Request failed with status code: 504',
      expectedMessage: 'The query to fetch items experienced a timeout error. Narrow your query with a more specific filter and try again.',
    },
    {
      scenario: 'an unhandled status code that reports a message',
      error: 'Request failed with status code: 500. Error message: Internal error',
      expectedMessage: 'The query failed due to the following error: (status 500) Internal error.',
    },
  ])('should build the title and message when $scenario', ({ error, expectedMessage }) => {
    const result = getQueryError(new Error(error), 'items');

    expect(result).toEqual({ title: 'Error during items query', message: expectedMessage });
  });

  test.each(['work items', 'workorders', 'testplans', 'alarms', 'results', 'steps', 'data tables'])(
    'should interpolate the %s context into the title and not found message',
    (context) => {
      const result = getQueryError(new Error('Request failed with status code: 404'), context);

      expect(result).toEqual({
        title: `Error during ${context} query`,
        message: `The query to fetch ${context} failed because the requested resource was not found. Please check the query parameters and try again.`,
      });
    }
  );
});
