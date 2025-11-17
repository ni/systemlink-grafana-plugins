import React, { useState } from 'react';
import { AsyncSelect } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { toOption } from '@grafana/data';
import { FloatingError, parseErrorMessage } from 'core/errors';
import { isValidId } from 'datasources/data-frame/utils';
import { Props } from '../../types';
import { DataFrameQueryEditorCommonV1 } from './DataFrameQueryEditorCommonV1';

export const DataFrameVariableQueryEditorV1 = (props: Props) => {
    const [errorMsg, setErrorMsg] = useState<string | undefined>('');
    const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
    const common = new DataFrameQueryEditorCommonV1(props, handleError);

    return (
        <div style={{ position: 'relative' }}>
            <InlineField label="Id">
                <AsyncSelect
                    allowCreateWhileLoading
                    allowCustomValue
                    cacheOptions={false}
                    defaultOptions
                    isValidNewOption={isValidId}
                    loadOptions={common.handleLoadOptions}
                    onChange={common.handleIdChange}
                    placeholder="Search by name or enter id"
                    width={30}
                    value={common.query.tableId ? toOption(common.query.tableId) : null}
                />
            </InlineField>
            <FloatingError message={errorMsg} />
        </div>
    );
}
