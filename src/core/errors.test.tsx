import { render, screen } from '@testing-library/react'
import { FetchError } from '@grafana/runtime';
import { act } from 'react-dom/test-utils';
import { FloatingError, parseErrorMessage } from './errors';
import { SystemLinkError } from "./types";
import React from 'react';
import { errorCodes } from "../datasources/data-frame/constants";

test('renders with error message', () => {
  render(<FloatingError message='error msg'/>)

  expect(screen.getByText('error msg')).toBeInTheDocument()
})

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
