import React from "react";
import { render } from "@testing-library/react";
import { DataFrameQueryEditorWrapper } from "./DataFrameQueryEditorWrapper";
import { DataFrameDataSource } from "../DataFrameDataSource";
import { DataFrameQueryType, Props, DataFrameQuery } from "../types";

jest.mock('./v2/DataFrameQueryEditorV2', () => ({
    DataFrameQueryEditorV2: () => <div className="data-frame-query-editor-v2" />
}));

describe('DataFrameQueryEditorWrapper', () => {
    const mockDatasource = {
        instanceSettings: {
            jsonData: {},
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

    it('should render DataFrameQueryEditorV2 by default', () => {
        const { container } = render(<DataFrameQueryEditorWrapper {...props} />);
        expect(container.querySelector('.data-frame-query-editor-v2')).toBeInTheDocument();
    });
});
