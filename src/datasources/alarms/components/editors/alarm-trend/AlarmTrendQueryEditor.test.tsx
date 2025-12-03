import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AlarmTrendQueryEditor } from './AlarmTrendQueryEditor';
import { QueryType } from 'datasources/alarms/types/types';
import { AlarmTrendQuery } from 'datasources/alarms/types/AlarmTrend.types';
import { AlarmTrendQueryHandler } from 'datasources/alarms/query-type-handlers/alarm-trend/AlarmTrendQueryHandler';

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
} as unknown as AlarmTrendQueryHandler;

const defaultProps = {
  query: {
    refId: 'A',
    queryType: QueryType.AlarmTrend
  },
  handleQueryChange: mockHandleQueryChange,
  datasource: mockDatasource
};

async function renderElement(query: AlarmTrendQuery = { ...defaultProps.query }) {
  return await act(async () => {
    const reactNode = React.createElement(AlarmTrendQueryEditor, { ...defaultProps, query });

    return render(reactNode);
  });
}

describe('AlarmTrendQueryEditor', () => {
  it('should render the query builder', async () => {
    await renderElement();

    expect(screen.getAllByText('Property').length).toBe(1);
    expect(screen.getAllByText('Operator').length).toBe(1);
    expect(screen.getAllByText('Value').length).toBe(1);
  });

  it('should render the group by severity toggle', async () => {
    await renderElement();

    const groupBySeveritySwitch = screen.getByRole('switch');
    expect(groupBySeveritySwitch).toBeInTheDocument();
    expect(groupBySeveritySwitch).toHaveAttribute('type', 'checkbox');
  });

  it('should render group by severity toggle as checked when groupBySeverity is true', async () => {
    await renderElement({ 
      refId: 'A', 
      queryType: QueryType.AlarmTrend, 
      groupBySeverity: true 
    });

    const groupBySeveritySwitch = screen.getByRole('switch');
    expect(groupBySeveritySwitch).toBeChecked();
  });

  it('should render group by severity toggle as unchecked when groupBySeverity is false', async () => {
    await renderElement({ 
      refId: 'A', 
      queryType: QueryType.AlarmTrend, 
      groupBySeverity: false 
    });

    const groupBySeveritySwitch = screen.getByRole('switch');
    expect(groupBySeveritySwitch).not.toBeChecked();
  });

  it('should call handleQueryChange with false when group by severity toggle is unchecked', async () => {
    await renderElement({ 
      refId: 'A', 
      queryType: QueryType.AlarmTrend, 
      groupBySeverity: true 
    });

    const groupBySeveritySwitch = screen.getByRole('switch');
    fireEvent.click(groupBySeveritySwitch);

    expect(mockHandleQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({ 
        refId: 'A',
        queryType: QueryType.AlarmTrend,
        groupBySeverity: false 
      })
    );
  });

  it('should call handleQueryChange with true when group by severity toggle is checked', async () => {
    await renderElement({ 
      refId: 'A', 
      queryType: QueryType.AlarmTrend, 
      groupBySeverity: false 
    });

    const groupBySeveritySwitch = screen.getByRole('switch');
    fireEvent.click(groupBySeveritySwitch);

    expect(mockHandleQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({ 
        refId: 'A',
        queryType: QueryType.AlarmTrend,
        groupBySeverity: true
      })
    );
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
    const container = await renderElement({ refId: 'A', queryType: QueryType.AlarmTrend, filter: 'same-query' });
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'same-query' } };
    
    queryBuilder?.dispatchEvent(new CustomEvent('change', event));
    
    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).not.toHaveBeenCalled();
  });

  it('should call datasource.globalVariableOptions and render variable name when its filter is applied', async () => {
    const container = await renderElement({ refId: 'A', queryType: QueryType.AlarmTrend, filter: 'currentSeverityLevel = "$value1"' });

    expect(mockDatasource.globalVariableOptions).toHaveBeenCalled();
    expect(container.getByText('$var1')).toBeInTheDocument();
  });

  it('should call loadWorkspaces and render workspace name when workspace filter is applied', async () => {
    const container = await renderElement({ refId: 'A', queryType: QueryType.AlarmTrend, filter: 'workspace = "1"' });

    expect(mockDatasource.loadWorkspaces).toHaveBeenCalled();
    expect(container.getByText('WorkspaceName')).toBeInTheDocument();
  });

  it('should display error title and description when error occurs', async () => {
    mockDatasource.loadWorkspaces = jest.fn().mockImplementation(() => {
      mockDatasource.errorTitle = 'Test Error Title';
      mockDatasource.errorDescription = 'Test Error Description';
      return Promise.resolve(new Map());
    });
    
    await renderElement();

    expect(screen.getByText('Test Error Title')).toBeInTheDocument();
    expect(screen.getByText('Test Error Description')).toBeInTheDocument();
  });

  it('should preserve groupBySeverity when filter changes', async () => {
    const container = await renderElement({ 
      refId: 'A', 
      queryType: QueryType.AlarmTrend, 
      groupBySeverity: true,
      filter: 'old-query'
    });
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'new-query' } };

    queryBuilder?.dispatchEvent(new CustomEvent('change', event));

    expect(mockHandleQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({ 
        filter: 'new-query',
        groupBySeverity: true
      })
    );
  });
});
