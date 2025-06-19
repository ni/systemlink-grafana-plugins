import { act, render, RenderResult, screen, waitFor } from '@testing-library/react';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQueryEditor } from './WorkOrdersQueryEditor';
import { OutputType, WorkOrderProperties, WorkOrderPropertiesOptions, WorkOrdersQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import React from 'react';
import userEvent from '@testing-library/user-event';
import selectEvent, { select } from 'react-select-event';

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

describe('WorkOrdersQueryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderElement(query: WorkOrdersQuery = { refId: 'A', outputType: OutputType.Properties }) {
    return await act(async () => {
      const reactNode = React.createElement(WorkOrdersQueryEditor, { ...defaultProps, query });
      return render(reactNode);
    });
  }

  it('renders the query builder', async () => {
    await renderElement();

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
  });

  it('should render default query', async () => {
    const container = await renderElement();

    expect(container.getByRole('radio', { name: OutputType.Properties })).toBeInTheDocument();
    expect(container.getByRole('radio', { name: OutputType.Properties })).toBeChecked();
    expect(container.getByRole('radio', { name: OutputType.TotalCount })).toBeInTheDocument();
    expect(container.getByRole('radio', { name: OutputType.TotalCount })).not.toBeChecked();

    await waitFor(() => {
      const properties = container.getAllByRole('combobox')[0];
      expect(properties).toBeInTheDocument();
      expect(properties).toHaveAttribute('aria-expanded', 'false');
      expect(properties).toHaveDisplayValue('');
    });

    const orderBy = container.getAllByRole('combobox')[1];
    expect(orderBy).toBeInTheDocument();
    expect(orderBy).toHaveAccessibleDescription('Select a field to set the query order');
    expect(orderBy).toHaveDisplayValue('');

    const descending = container.getByRole('checkbox');
    expect(descending).toBeInTheDocument();
    expect(descending).not.toBeChecked();

    const take = container.getByRole('spinbutton');
    expect(take).toBeInTheDocument();
    expect(take).toHaveDisplayValue('');
  });

  
  it('should call onRunQuery on init', async() => {
    const query = {
      refId: 'A',
    }

    await renderElement(query);

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.Properties, refId: 'A' }));
    expect(mockOnRunQuery).toHaveBeenCalled();
  });
  
  it('should not call onRunQuery after init', async() => {
    const query = {
      refId: 'A',
      outputType: OutputType.Properties,
    }
    jest.clearAllMocks();

    await renderElement(query);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockOnRunQuery).not.toHaveBeenCalled();
  });

  describe('output type is total count', () => {
    let container: RenderResult;
    beforeEach(async() => {
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
      };
      container = await renderElement(query);
    });

    it('should not render properties', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
      };
      const container = await renderElement(query);

      await waitFor(() => {
        const properties = container.queryByRole('combobox', { name: 'Properties' });
        expect(properties).not.toBeInTheDocument();
      });
    });

    it('should not render order by', async () => {
      await waitFor(() => {
        const orderBy = container.queryByRole('combobox', { name: 'OrderBy' });
        expect(orderBy).not.toBeInTheDocument();
      });
    });

    it('should not render descending', async () => {
      await waitFor(() => {
        const descending = container.queryByRole('checkbox', { name: 'Descending' });
        expect(descending).not.toBeInTheDocument();
      });
    });

    it('should not render take', async () => {
      const take = container.queryByRole('spinbutton', { name: 'Take' });
      expect(take).not.toBeInTheDocument();
    });
  });

  describe('output type is properties', () => {
    let container: RenderResult;
    beforeEach(async() => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
      };
      container = await renderElement(query);
    });

    it('should render properties', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
      };
      const container = await renderElement(query);

      await waitFor(() => {
        const properties = container.getAllByRole('combobox')[0];
        expect(properties).toBeInTheDocument();
        expect(properties).toHaveAttribute('aria-expanded', 'false');
        expect(properties).toHaveDisplayValue('');
      });
    });

    it('should render order by', async () => {
      const orderBy = container.getAllByRole('combobox')[1];
      expect(orderBy).toBeInTheDocument();

     selectEvent.openMenu(orderBy);

     expect(screen.getByText('ID')).toBeInTheDocument();
     expect(screen.getByText('ID of the work order')).toBeInTheDocument();
     expect(screen.getByText('Updated At')).toBeInTheDocument();
     expect(screen.getByText('Latest update at time of the work order')).toBeInTheDocument();
    });

    it('should render descending', async () => {
      const descending = container.getByRole('checkbox');
      expect(descending).toBeInTheDocument();
    });

    it('should render take', async () => {
      const take = container.getByRole('spinbutton');
      expect(take).toBeInTheDocument();
    });
  });

  it('only allows numbers in Take field', async () => {
    const container = await renderElement();
    const recordCountInput = container.getByRole('spinbutton');

    // User tries to enter a non-numeric value
    await userEvent.clear(recordCountInput);
    await userEvent.type(recordCountInput, 'abc');
    await waitFor(() => {
      expect(recordCountInput).toHaveValue(null);
    });

    // User enters a valid numeric value
    await userEvent.clear(recordCountInput);
    await userEvent.type(recordCountInput, '500');
    await waitFor(() => {
      expect(recordCountInput).toHaveValue(500);
    });
  });

  it('should load workspaces and set them in state', async () => {
    await renderElement();

    const workspaces = await mockDatasource.loadWorkspaces();
    expect(workspaces).toBeDefined();
    expect(workspaces).toEqual(
        new Map([
            ['1', { id: '1', name: 'WorkspaceName' }],
            ['2', { id: '2', name: 'AnotherWorkspaceName' }],
        ])
    );
  });

  it('should load users and set them in state', async () => {
    await renderElement();

    const users = await mockDatasource.loadUsers();
    expect(users).toBeDefined();
    expect(users).toEqual(
      new Map([
        ['1', { id: '1', firstName: 'User', lastName: '1' }],
        ['2', { id: '2', firstName: 'User', lastName: '2' }],
      ])
    );
  });

  describe('onChange', () => {
    it('should call onChange with properties output type when switching from total count', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
      };
      const container = await renderElement(query);

      const propertiesRadio = container.getByRole('radio', { name: OutputType.Properties });
      userEvent.click(propertiesRadio);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.Properties }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange with total count output type when switching from properties', async () => {
      const container = await renderElement();

      const totalCountRadio = container.getByRole('radio', { name: OutputType.TotalCount });
      userEvent.click(totalCountRadio);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: OutputType.TotalCount }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange with properties when user selects properties', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
      };
      const container = await renderElement(query);

      const propertiesSelect = container.getAllByRole('combobox')[0];
      userEvent.click(propertiesSelect);
      await select(propertiesSelect, WorkOrderProperties[WorkOrderPropertiesOptions.WORKSPACE].label, {
        container: document.body,
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['WORKSPACE'] }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should show error when all properties are removed', async () => {
      const query = {
        refId: 'A',
        outputType: OutputType.Properties,
      };
      const container = await renderElement(query);

      const properties = container.getAllByRole('combobox')[0];
      // User adds a property
      await select(properties, "Workspace", { container: document.body });
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({ properties: ["WORKSPACE"] })
        )
      });
      
      // User removes the property
      const removeButton = screen.getByRole('button', { name: 'Remove' });
      await userEvent.click(removeButton);
  
      expect(screen.getByText('You must select at least one property.')).toBeInTheDocument();
    })

    it('should call onChange with order by when user changes order by', async () => {
      const container = await renderElement();
      const orderBySelect = container.getAllByRole('combobox')[1];

      userEvent.click(orderBySelect);
      await select(orderBySelect, 'ID', { container: document.body });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'ID' }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange with descending when user toggles descending', async () => {
      const container = await renderElement();
      const descendingCheckbox = container.getByRole('checkbox');

      userEvent.click(descendingCheckbox);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should call onChange when query by changes', async () => {
      const container = await renderElement();

      const queryBuilder = container.getByRole('dialog');
      expect(queryBuilder).toBeInTheDocument();

      // Simulate a change event
      const event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'new-query' }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should not call onChange when query by changes with same value', async () => {
      const container = await renderElement();
      mockOnChange.mockClear();
      mockOnRunQuery.mockClear();

      const queryBuilder = container.getByRole('dialog');
      expect(queryBuilder).toBeInTheDocument();

      // Simulate a change event
      let event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      // Simulate a change event with the same value
      event = { detail: { linq: 'new-query' } };
      queryBuilder?.dispatchEvent(new CustomEvent('change', event));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        expect(mockOnRunQuery).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onChange with take when user changes take', async () => {
      const container = await renderElement();
      const takeInput = container.getByRole('spinbutton');

      await userEvent.type(takeInput, '10');
      await userEvent.tab(); // Trigger onCommitChange

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should show error message when when user changes take to number greater than max take', async () => {
      const container = await renderElement();
      const takeInput = container.getByRole('spinbutton');
      mockOnChange.mockClear();
      mockOnRunQuery.mockClear();

      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '1000000');
      await userEvent.tab();

      await waitFor(() => {
        expect(container.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ take: undefined }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should show error message when when user changes take to number less than min take', async () => {
      const container = await renderElement();
      const takeInput = container.getByRole('spinbutton');
      mockOnChange.mockClear();
      mockOnRunQuery.mockClear();

      await userEvent.clear(takeInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(container.getByText('Enter a value greater than or equal to 0')).toBeInTheDocument();
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ take: undefined }));
        expect(mockOnRunQuery).toHaveBeenCalled();
      });
    });

    it('should not show error message when when user changes take to number between min and max take', async () => {
      const container = await renderElement();
      const takeInput = container.getByRole('spinbutton');

      // User enters a value greater than max take
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '1000000');
      await userEvent.tab();
      await waitFor(() => {
        expect(container.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
      });

      // User enters a valid value
      await userEvent.clear(takeInput);
      await userEvent.type(takeInput, '100');
      await userEvent.tab();

      await waitFor(() => {
        expect(container.queryByText('Enter a value greater than or equal to 0')).not.toBeInTheDocument();
        expect(container.queryByText('Enter a value less than or equal to 10,000')).not.toBeInTheDocument();
      });
    });
  });
});
