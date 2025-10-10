import React from 'react';
import { render } from '@testing-library/react';
import { DataFrameVariableQueryEditorWrapper } from './DataFrameVariableQueryEditorWrapper';
import { DataFrameQueryV1, DataFrameQueryType, Props } from '../types';
import { DataFrameDataSource } from '../DataFrameDataSource';

jest.mock('./v1/DataFrameVariableQueryEditorV1', () => ({
    DataFrameVariableQueryEditorV1: () => <div className="data-frame-variable-query-editor-v1" />,
}));

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
            } as DataFrameQueryV1,
            onChange: jest.fn(),
            onRunQuery: jest.fn(),
        };

        return props;
    };

    it('renders DataFrameVariableQueryEditorV1 when queryByDataTableProperties toggle is disabled', () => {
        const props = createProps({
            featureToggles: {
                queryByDataTableProperties: false,
            },
        });

        const { container } = render(<DataFrameVariableQueryEditorWrapper {...props} />);

        expect(container.querySelector('.data-frame-variable-query-editor-v1')).toBeInTheDocument();
        expect(container.querySelector('.data-frame-variable-query-editor-v2')).not.toBeInTheDocument();
    });

    it('renders DataFrameVariableQueryEditorV2 when queryByDataTableProperties toggle is enabled', () => {
        const props = createProps({
            featureToggles: {
                queryByDataTableProperties: true,
            },
        });

        const { container } = render(<DataFrameVariableQueryEditorWrapper {...props} />);

        expect(container.querySelector('.data-frame-variable-query-editor-v2')).toBeInTheDocument();
        expect(container.querySelector('.data-frame-variable-query-editor-v1')).not.toBeInTheDocument();
    });
});
