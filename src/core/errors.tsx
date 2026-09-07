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
