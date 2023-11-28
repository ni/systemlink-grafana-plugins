import {isFetchError} from '@grafana/runtime';
import {Alert} from '@grafana/ui';
import {errorCodes} from './constants';
import React, {useState, useEffect} from 'react';
import {useTimeoutFn} from 'react-use';
import {isSystemLinkError} from "./helper";

export const FloatingError = ({message = ''}) => {
    const [hide, setHide] = useState(false);
    const reset = useTimeoutFn(() => setHide(true), 5000)[2];
    useEffect(() => {
        setHide(false);
        reset();
    }, [message, reset]);

    if (hide || !message) {
        return null;
    }
    return <Alert title={message} elevated style={{position: 'absolute', top: 0, right: 0, width: '50%'}}/>;
};

export const parseErrorMessage = (error: Error) => {
    if (isFetchError(error)) {
        if (isSystemLinkError(error.data)) {
            return errorCodes[error.data.error.code] ?? error.data.error.message;
        }

        return error.data.message || error.statusText;
    }

    return error.message;
};
