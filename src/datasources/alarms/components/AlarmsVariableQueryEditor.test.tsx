import { act, render, screen } from '@testing-library/react';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsVariableQuery } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import React from 'react';
import { AlarmsVariableQueryEditor } from './AlarmsVariableQueryEditor';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  listAlarmsDataSource: {
    loadWorkspaces: jest.fn().mockResolvedValue(
      new Map([
        ['1', { id: '1', name: 'WorkspaceName' }],
        ['2', { id: '2', name: 'AnotherWorkspaceName' }],
      ])
    ),
    globalVariableOptions: jest.fn(() => [
      { label: 'Workspace', value: 'workspace' },
      { label: 'Alarm ID', value: 'alarmId' }
    ]),
    get errorTitle() {
      return undefined as string | undefined;
    },
    get errorDescription() {
      return undefined as string | undefined;
    }
  }
} as unknown as AlarmsDataSource;

const defaultProps: QueryEditorProps<AlarmsDataSource, AlarmsVariableQuery> = {
  query: {
    refId: 'A',
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

describe('AlarmsVariableQueryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderElement(query: AlarmsVariableQuery = { refId: 'A' }) {
    return await act(async () => {
      const reactNode = React.createElement(AlarmsVariableQueryEditor, { ...defaultProps, query });
      return render(reactNode);
    });
  }

  it('renders the component', async () => {
    await renderElement();
    
    expect(screen.getByText('Query By')).toBeInTheDocument();
  });

  it('should call listAlarmsDataSource.loadWorkspaces on render', async () => {
    await renderElement();

    expect(mockDatasource.listAlarmsDataSource.loadWorkspaces).toHaveBeenCalled();
  });

  it('should load workspaces from datasource', async () => {
    const workspaces = await mockDatasource.listAlarmsDataSource.loadWorkspaces();
    expect(workspaces).toBeDefined();
    expect(workspaces).toEqual(
      new Map([
        ['1', { id: '1', name: 'WorkspaceName' }],
        ['2', { id: '2', name: 'AnotherWorkspaceName' }],
      ])
    );
  });

  it('should render with undefined filter', async () => {
    await renderElement({ refId: 'A' });

    expect(screen.getByText('Query By')).toBeInTheDocument();
  });

  it('should render with proper filter', async () => {
    await renderElement({ refId: 'A', filter: 'id = "test"' });

    expect(screen.getByText('Query By')).toBeInTheDocument();
  });

  it('should call onChange when filter changes', async () => {
    const container = await renderElement({ refId: 'A' });
    const queryBuilderElement = container.container.querySelector('smart-query-builder');
    const changeEvent = new CustomEvent('change', {
      detail: { linq: 'name = "test filter"' }
    });
    
    act(() => {
      queryBuilderElement?.dispatchEvent(changeEvent);
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      refId: 'A',
      filter: 'name = "test filter"'
    });
  });

  it('should not call onChange when filter value is the same', async () => {
    const container = await renderElement({ refId: 'A', filter: 'existing filter' });
    mockOnChange.mockClear();

    const queryBuilderElement = container.container.querySelector('smart-query-builder');
    const changeEvent = new CustomEvent('change', {
      detail: { linq: 'existing filter' }
    });
    
    act(() => {
      queryBuilderElement?.dispatchEvent(changeEvent);
    });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should pass correct props to AlarmsQueryBuilder', async () => {
    await renderElement({ refId: 'A', filter: 'existing filter' });

    const queryBuilder = screen.getByRole('dialog');
    expect(queryBuilder).toBeInTheDocument();
    expect(mockDatasource.listAlarmsDataSource.globalVariableOptions).toHaveBeenCalled();
  });

  it('should preserve existing query properties when filter changes', async () => {
    const existingQuery = { 
      refId: 'TestRef', 
      filter: 'old filter',
      customProperty: 'should be preserved' 
    } as AlarmsVariableQuery & { customProperty: string };

    const container = await renderElement(existingQuery);
    const queryBuilderElement = container.container.querySelector('smart-query-builder');
    
    const changeEvent = new CustomEvent('change', {
      detail: { linq: 'new filter value' }
    });
    
    act(() => {
      queryBuilderElement?.dispatchEvent(changeEvent);
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      refId: 'TestRef',
      filter: 'new filter value',
      customProperty: 'should be preserved'
    });
  });

  it('should show floating error when datasource has error', async () => {
    const mockDatasourceWithError = {
      ...mockDatasource,
      listAlarmsDataSource: {
        ...mockDatasource.listAlarmsDataSource,
        get errorTitle() {
          return 'Test Error Title';
        },
        get errorDescription() {
          return 'Test error description';
        }
      }
    } as unknown as AlarmsDataSource;

    const propsWithError = { ...defaultProps, datasource: mockDatasourceWithError };
    
    await act(async () => {
      const reactNode = React.createElement(AlarmsVariableQueryEditor, propsWithError);
      render(reactNode);
    });

    expect(screen.getByText('Query By')).toBeInTheDocument();
    expect(screen.getByText('Test Error Title')).toBeInTheDocument();
    expect(screen.getByText('Test error description')).toBeInTheDocument();
  });
});
