import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { AlarmsCountQueryEditor } from './AlarmsCountQueryEditor';
import { QueryType } from 'datasources/alarms/types/types';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';
import { AlarmsCountDataSource } from 'datasources/alarms/query-type-handlers/alarms-count/AlarmsCountDataSource';

const mockHandleQueryChange = jest.fn();
const mockGlobalVars = [{ label: '$var1', value: '$value1' }];
const mockDatasource = {
  globalVariableOptions: jest.fn(() => mockGlobalVars),
  loadWorkspaces: jest.fn().mockResolvedValue(
    new Map([
      ['1', { id: '1', name: 'WorkspaceName' }],
      ['2', { id: '2', name: 'AnotherWorkspaceName' }],
    ])
  ),
} as unknown as AlarmsCountDataSource;

const defaultProps = {
  query: {
    refId: 'A',
    queryType: QueryType.AlarmsCount
  },
  handleQueryChange: mockHandleQueryChange,
  datasource: mockDatasource
};

async function renderElement(query: AlarmsCountQuery = { ...defaultProps.query }) {
  return await act(async () => {
    const reactNode = React.createElement(AlarmsCountQueryEditor, { ...defaultProps, query });

    return render(reactNode);
  });
}

describe('AlarmsCountQueryEditor', () => {
  it('should render the query builder', async () => {
    await renderElement();

    expect(screen.getAllByText('Property').length).toBe(1);
    expect(screen.getAllByText('Operator').length).toBe(1);
    expect(screen.getAllByText('Value').length).toBe(1);
  });

  it('should call handleQueryChange when filter changes', async () => {
    const container = await renderElement();
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'new-query' } };

    queryBuilder?.dispatchEvent(new CustomEvent('change', event));

    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ filter: 'new-query' }));
  });

  it('should not call handleQueryChange when filter changes with same value', async () => {
    const container = await renderElement({ refId: 'A', queryType: QueryType.AlarmsCount, filter: 'same-query' });
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'same-query' } };
    
    queryBuilder?.dispatchEvent(new CustomEvent('change', event));
    
    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).not.toHaveBeenCalled();
  });

  it('should call datasource.globalVariableOptions and render variable name when its filter is applied', async () => {
    const container = await renderElement({ refId: 'A', queryType: QueryType.AlarmsCount, filter: 'currentSeverityLevel = "$value1"' });

    expect(mockDatasource.globalVariableOptions).toHaveBeenCalled();
    expect(container.getByText('$var1')).toBeInTheDocument();
  });

  it('should call loadWorkspaces and render workspace name when workspace filter is applied', async () => {
    const container = await renderElement({ refId: 'A', queryType: QueryType.AlarmsCount, filter: 'workspace = "1"' });

    expect(mockDatasource.loadWorkspaces).toHaveBeenCalled();
    expect(container.getByText('WorkspaceName')).toBeInTheDocument();
  });

  it('should display error title and description when error occurs', async () => {
    mockDatasource.errorTitle = 'Test Error Title';
    mockDatasource.errorDescription = 'Test Error Description';
    
    await renderElement();

    expect(screen.getByText('Test Error Title')).toBeInTheDocument();
    expect(screen.getByText('Test Error Description')).toBeInTheDocument();
  });
});
