import React from 'react';
import { render } from '@testing-library/react';
import { DataFrameVariableQueryEditorWrapper } from './DataFrameVariableQueryEditorWrapper';
import { DataFrameDataSource } from '../DataFrameDataSource';
import { DataFrameQuery, DataFrameQueryType, Props } from '../types';

jest.mock('./v2/DataFrameVariableQueryEditorV2', () => ({
    DataFrameVariableQueryEditorV2: () => <div className="data-frame-variable-query-editor-v2" />,
}));

describe('DataFrameVariableQueryEditorWrapper', () => {
    const createProps = (jsonData: Record<string, unknown> = {}) => {
        const datasource = {
            instanceSettings: {
                jsonData,
            },
        } as unknown as DataFrameDataSource;

        const props: Props = {
            datasource,
            query: {
                type: DataFrameQueryType.Data,
            } as DataFrameQuery,
            onChange: jest.fn(),
            onRunQuery: jest.fn(),
        };

        return props;
    };

    it('renders DataFrameVariableQueryEditorV2 by default', () => {
        const props = createProps({});

        const { container } = render(<DataFrameVariableQueryEditorWrapper {...props} />);

        expect(container.querySelector('.data-frame-variable-query-editor-v2')).toBeInTheDocument();
    });
});
