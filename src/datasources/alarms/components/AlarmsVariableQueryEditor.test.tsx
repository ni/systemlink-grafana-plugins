import { act, fireEvent, render, screen } from '@testing-library/react';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsVariableQuery } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import React from 'react';
import { AlarmsVariableQueryEditor } from './AlarmsVariableQueryEditor';
import { takeErrorMessages } from '../constants/AlarmsQueryEditor.constants';
import { defaultListAlarmsVariableQuery } from '../constants/DefaultQueries.constants';

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareVariableQuery: jest.fn((query: AlarmsVariableQuery) => ({
    ...defaultListAlarmsVariableQuery,
    ...query
  })),
  listAlarmsQueryHandler: {
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

jest.mock('./query-builder/AlarmsQueryBuilder', () => ({
  AlarmsQueryBuilder: jest.fn(({ filter, onChange, workspaces, globalVariableOptions }) => {
    return (
      <div data-testid="mocked-query-builder">
        <span data-testid="filter-prop">{filter || 'no-filter'}</span>
        <span data-testid="workspaces-count">{workspaces.length}</span>
        <span data-testid="global-variables-count">{globalVariableOptions.length}</span>
        <button onClick={(e) => onChange({ detail: { linq: 'test-filter' } })}>
          Trigger Change
        </button>
      </div>
    );
  })
}));

jest.mock('../../../core/errors', () => ({
  FloatingError: jest.fn(({ message, innerMessage, severity }) => (
    <div data-testid="floating-error">
      <span data-testid="error-message">{message || 'no-message'}</span>
      <span data-testid="error-inner">{innerMessage || 'no-inner'}</span>
      <span data-testid="error-severity">{severity}</span>
    </div>
  ))
}));

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

  it('should call listAlarmsQueryHandler.loadWorkspaces on render', async () => {
    await renderElement();

    expect(mockDatasource.listAlarmsQueryHandler.loadWorkspaces).toHaveBeenCalled();
  });

  it('should load workspaces from datasource', async () => {
    const workspaces = await mockDatasource.listAlarmsQueryHandler.loadWorkspaces();
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

  it('should show floating error when datasource has error', async () => {
    const mockDatasourceWithError = {
      ...mockDatasource,
      listAlarmsQueryHandler: {
        ...mockDatasource.listAlarmsQueryHandler,
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

  describe('Child Component Props Tests', () => {
    it('should pass correct filter prop to AlarmsQueryBuilder', async () => {
        await renderElement({ refId: 'A', filter: 'id = "test-id"' });
  
        expect(screen.getByTestId('filter-prop')).toHaveTextContent('id = "test-id"');
    });
  
    it('should pass empty filter prop when filter is undefined', async () => {
        await renderElement({ refId: 'A' });
    
        expect(screen.getByTestId('filter-prop')).toHaveTextContent('no-filter');
    });
    
    it('should pass workspaces array to AlarmsQueryBuilder', async () => {
        await renderElement({ refId: 'A' });
    
        expect(screen.getByTestId('workspaces-count')).toHaveTextContent('2');
    });
    
    it('should pass globalVariableOptions to AlarmsQueryBuilder', async () => {
        await renderElement({ refId: 'A' });
    
        expect(screen.getByTestId('global-variables-count')).toHaveTextContent('2');
    });
    
    it('should pass error props to FloatingError component', async () => {
        const mockDatasourceWithError = {
        ...mockDatasource,
        listAlarmsQueryHandler: {
          ...mockDatasource.listAlarmsQueryHandler,
          get errorTitle() {
            return 'Test Error Title';
          },
          get errorDescription() {
            return 'Test Error Description';
          }
        }
      } as unknown as AlarmsDataSource;

      const propsWithError = { ...defaultProps, datasource: mockDatasourceWithError };
      
      await act(async () => {
        const reactNode = React.createElement(AlarmsVariableQueryEditor, propsWithError);
        render(reactNode);
      });
    
        expect(screen.getByTestId('error-message')).toHaveTextContent('Test Error Title');
        expect(screen.getByTestId('error-inner')).toHaveTextContent('Test Error Description');
        expect(screen.getByTestId('error-severity')).toHaveTextContent('warning');
    });
    
    it('should handle undefined error props in FloatingError component', async () => {
        await renderElement({ refId: 'A' });
    
        expect(screen.getByTestId('error-message')).toHaveTextContent('no-message');
        expect(screen.getByTestId('error-inner')).toHaveTextContent('no-inner');
    });
  });
  
  it('should call onChange when AlarmsQueryBuilder triggers change', async () => {
    await renderElement({ refId: 'A' });
    
    const changeButton = screen.getByText('Trigger Change');
    fireEvent.click(changeButton);
    
    expect(mockOnChange).toHaveBeenCalledWith({
      refId: 'A',
      filter: 'test-filter',
      descending: true,
      take: 1000
    });
  });

  describe('Take Control Tests', () => {
    it('should render take input with 1000 as default value', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      expect(takeInput).toBeInTheDocument();
      expect(takeInput).toHaveAttribute('type', 'number');
      expect(takeInput).toHaveValue(1000);
    });

    it('should render take input with custom value', async () => {
      const customTake = 500;
      await renderElement({ refId: 'A', take: customTake });

      const takeInput = screen.getByRole('spinbutton');
      expect(takeInput).toHaveValue(customTake);
    });

    it('should call onChange when take value is changed', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '250' } });
      fireEvent.blur(takeInput);

      expect(mockOnChange).toHaveBeenCalledWith({
        refId: 'A',
        take: 250,
        descending: true,
        filter: ""
      });
    });

    it('should not call onChange until take input loses focus', async () => {
      await renderElement({ refId: 'A' });
      const takeInput = screen.getByRole('spinbutton');

      fireEvent.change(takeInput, { target: { value: '250' } });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should call onChange when take value is invalid', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: 'invalid' } });
      fireEvent.blur(takeInput);

      expect(mockOnChange).toHaveBeenCalledWith({
        refId: 'A',
        take: NaN,
        descending: true,
        filter: ""
      });
    });

    it('should preserve other query properties when take changes', async () => {
      const initialQuery = { refId: 'A', filter: 'existing filter', descending: true };
      await renderElement(initialQuery);

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '300' } });
      fireEvent.blur(takeInput);

      expect(mockOnChange).toHaveBeenCalledWith({
        refId: 'A',
        filter: 'existing filter',
        descending: true,
        take: 300
      });
    });

    it('should display minimum take error message when take value is below 1', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '0' } });
      fireEvent.blur(takeInput);

      expect(screen.getByText(takeErrorMessages.minErrorMsg)).toBeInTheDocument();
    });

    it('should display maximum take error message when take value is above 1000', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '99999' } });
      fireEvent.blur(takeInput);

      expect(screen.getByText(takeErrorMessages.maxErrorMsg)).toBeInTheDocument();
    });

    it('should display minimum error message for negative values', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '-5' } });
      fireEvent.blur(takeInput);

      expect(screen.getByText(takeErrorMessages.minErrorMsg)).toBeInTheDocument();
    });

    it('should display minimum take error message for NaN values', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: 'invalid' } });
      fireEvent.blur(takeInput);

      expect(screen.getByText(takeErrorMessages.minErrorMsg)).toBeInTheDocument();
    });

    it('should display minimum take error message for empty string', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '' } });
      fireEvent.blur(takeInput);

      expect(screen.getByText(takeErrorMessages.minErrorMsg)).toBeInTheDocument();
    });

    it('should clear error message when valid value is entered', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '0' } });
      fireEvent.blur(takeInput);
      
      expect(screen.getByText(takeErrorMessages.minErrorMsg)).toBeInTheDocument();
      
      fireEvent.change(takeInput, { target: { value: '100' } });
      fireEvent.blur(takeInput);
      
      expect(screen.queryByText(takeErrorMessages.minErrorMsg)).not.toBeInTheDocument();
      expect(screen.queryByText(takeErrorMessages.maxErrorMsg)).not.toBeInTheDocument();
    });

    it('should maintain error message consistency across multiple invalid inputs', async () => {
      await renderElement({ refId: 'A' });

      const takeInput = screen.getByRole('spinbutton');
      
      const invalidMinValues = ['0', '-1', '-100', 'abc', ''];
      
      for (const value of invalidMinValues) {
        fireEvent.change(takeInput, { target: { value } });
        fireEvent.blur(takeInput);
        
        expect(screen.getByText(takeErrorMessages.minErrorMsg)).toBeInTheDocument();
        expect(screen.queryByText(takeErrorMessages.maxErrorMsg)).not.toBeInTheDocument();
      }
      
      const invalidMaxValues = ['99999', '100000'];
      
      for (const value of invalidMaxValues) {
        fireEvent.change(takeInput, { target: { value } });
        fireEvent.blur(takeInput);
        
        expect(screen.getByText(takeErrorMessages.maxErrorMsg)).toBeInTheDocument();
        expect(screen.queryByText(takeErrorMessages.minErrorMsg)).not.toBeInTheDocument();
      }
    });
  });

  describe('Descending Control Tests', () => {
    it('should render descending switch with true as default value', async () => {
      await renderElement({ refId: 'A' });

      const descendingSwitch = screen.getByRole('switch');
      expect(descendingSwitch).toBeInTheDocument();
      expect(descendingSwitch).toHaveAttribute('type', 'checkbox');
      expect(descendingSwitch).toBeChecked();
    });

    it('should render descending switch with custom value', async () => {
      const customDescending = false;
      await renderElement({ refId: 'A', descending: customDescending });

      const descendingSwitch = screen.getByRole('switch');
      expect(descendingSwitch).not.toBeChecked();
    });

    it('should call onChange when descending switch is toggled', async () => {
      await renderElement({ refId: 'A', descending: false });

      const descendingSwitch = screen.getByRole('switch');
      expect(descendingSwitch).not.toBeChecked();

      fireEvent.click(descendingSwitch);

      expect(mockOnChange).toHaveBeenCalledWith({
        refId: 'A',
        descending: true,
        take: 1000,
        filter: ''
      });
    });

    it('should preserve other query properties when descending changes', async () => {
      const initialQuery = { refId: 'A', filter: 'test filter', take: 500 };
      await renderElement(initialQuery);

      const descendingSwitch = screen.getByRole('switch');
      fireEvent.click(descendingSwitch);

      expect(mockOnChange).toHaveBeenCalledWith({
        refId: 'A',
        filter: 'test filter',
        take: 500,
        descending: false
      });
    });
  });
});

