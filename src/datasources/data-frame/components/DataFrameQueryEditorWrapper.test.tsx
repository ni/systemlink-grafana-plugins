import React from "react";
import { render } from "@testing-library/react";
import { DataFrameQueryEditorWrapper } from "./DataFrameQueryEditorWrapper";
import { DataFrameDataSourceV1 } from "../datasources/v1/DataFrameDataSourceV1";
import { DataFrameQueryV1, DataFrameQueryType, PropsV1 } from "../types";

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
    } as unknown as DataFrameDataSourceV1;
    const mockQuery = {
        type: DataFrameQueryType.Data
    } as unknown as DataFrameQueryV1
    const props: PropsV1 = {
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
