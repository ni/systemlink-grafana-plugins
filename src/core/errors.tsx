import { isFetchError } from '@grafana/runtime';
import { Alert, AlertVariant } from '@grafana/ui';
import { errorCodes } from '../datasources/data-frame/constants';
import React, { useState, useEffect } from 'react';
import { useTimeoutFn } from 'react-use';
import { isSystemLinkError } from './utils';

export const FloatingError = ({ message = '', innerMessage = '', severity = 'error' }) => {
  const [hide, setHide] = useState(false);
  const reset = useTimeoutFn(() => setHide(true), 500000)[2];
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
      severity={severity as AlertVariant}
      onRemove={() => setHide(true)}
    >
      {innerMessage && <div>{innerMessage}</div>}
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
