
import { act, render, waitFor } from '@testing-library/react';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQueryEditor } from './WorkOrdersQueryEditor';
import { OutputType, WorkOrdersQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: WorkOrdersQuery) => query),
  globalVariableOptions: jest.fn(() => []),
  loadWorkspaces: jest.fn().mockResolvedValue(
      new Map([
          ['1', { id: '1', name: 'WorkspaceName' }],
          ['2', { id: '2', name: 'AnotherWorkspaceName' }],
      ])
  ),
  loadUsers: jest.fn().mockResolvedValue(
    new Map([
      ['1', { id: '1', firstName: 'User', lastName: '1' }],
      ['2', { id: '2', firstName: 'User', lastName: '2' }],
    ])
  ),
} as unknown as WorkOrdersDataSource;

const defaultProps: QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery> = {
  query: {
    refId: 'A',
    outputType: OutputType.Properties,
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};
  
  

describe('WorkOrdersQueryEditor2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderElement(query: WorkOrdersQuery = { refId: 'A', outputType: OutputType.Properties }) {
    return await act(async () => {
      const reactNode = React.createElement(WorkOrdersQueryEditor, { ...defaultProps, query });
      return render(reactNode);
    });
  }

  it('should call onChange with order by when user changes order by', async () => {
    const container = await renderElement();
    const cbs = container.getAllByRole('combobox');
    const orderBySelect = container.getAllByRole('combobox')[1];
    console.log(cbs[0].outerHTML);
    console.log(cbs[1].outerHTML);

    userEvent.click(orderBySelect);
    await select(orderBySelect, 'ID', { container: document.body });

    await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
        expect(mockOnRunQuery).toHaveBeenCalled();
    });
  });
});