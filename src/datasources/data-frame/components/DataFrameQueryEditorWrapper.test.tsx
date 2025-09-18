import React from "react";
import { render } from "@testing-library/react";
import { DataFrameQueryEditorWrapper } from "./DataFrameQueryEditorWrapper";
import { DataFrameDataSource } from "../DataFrameDataSource";
import { DataFrameQuery, DataFrameQueryType } from "../types";
import { Props } from "./DataFrameQueryEditorCommon";

jest.mock('./v1/DataFrameQueryEditorV1', () => ({
    DataFrameQueryEditorV1: () => <div className="data-frame-query-editor-v1" />
}));

jest.mock('./v2/DataFrameQueryEditorV2', () => ({
    DataFrameQueryEditorV2: () => <div className="data-frame-query-editor-v2" />
}));

describe('DataFrameQueryEditorWrapper', () => {
    const mockDatasource = {
        instanceSettings: {
            jsonData: {
                featureToggles: {
                    queryByDataTableProperties: false,
                },
            },
        },
    } as unknown as DataFrameDataSource;
    const mockQuery = {
        type: DataFrameQueryType.Data
    } as unknown as DataFrameQuery
    const props: Props = {
        datasource: mockDatasource,
        query: mockQuery,
        onChange: jest.fn(),
        onRunQuery: jest.fn(),
    };

    it('should render DataFrameQueryEditorV1 when queryByDataTableProperties is false', () => {
        const { container } = render(<DataFrameQueryEditorWrapper {...props} />);
        expect(container.querySelector('.data-frame-query-editor-v1')).toBeInTheDocument();
    });

    it('should render DataFrameQueryEditorV2 when queryByDataTableProperties is true', () => {
        mockDatasource.instanceSettings.jsonData.featureToggles.queryByDataTableProperties = true;
        const { container } = render(<DataFrameQueryEditorWrapper {...props} />);
        expect(container.querySelector('.data-frame-query-editor-v2')).toBeInTheDocument();
    });
});
