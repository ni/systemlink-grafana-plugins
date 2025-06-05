import { render, screen } from '@testing-library/react'
import { FetchError } from '@grafana/runtime';
import { act } from 'react-dom/test-utils';
import { extractErrorInfo, FloatingError, parseErrorMessage } from './errors';
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
  expect(screen.getByRole('alert')).toHaveAttribute('data-testid', `data-testid Alert ${severity}`);
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
