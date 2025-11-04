import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryType, TransitionInclusionOption } from 'datasources/alarms/types/types';
import { ListAlarmsQueryHandler } from 'datasources/alarms/query-type-handlers/list-alarms/ListAlarmsQueryHandler';
import { AlarmsProperties, ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';
import { ListAlarmsQueryEditor } from './ListAlarmsQueryEditor';
import userEvent from '@testing-library/user-event';
import { AlarmsPropertiesOptions, AlarmsTransitionInclusionOptions } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { select } from 'react-select-event';

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
} as unknown as ListAlarmsQueryHandler;

const defaultProps = {
  query: {
    refId: 'A',
    queryType: QueryType.ListAlarms,
  },
  handleQueryChange: mockHandleQueryChange,
  datasource: mockDatasource,
};

async function renderElement(query: ListAlarmsQuery = { ...defaultProps.query }) {
  return await act(async () => {
    const reactNode = React.createElement(ListAlarmsQueryEditor, { ...defaultProps, query });

    return render(reactNode);
  });
}

describe('ListAlarmsQueryEditor', () => {
  beforeAll(() => { 
    // JSDOM provides offsetHeight as 0 by default. 
    // Mocking it to return 30 because the ComboBox virtualization relies on this value 
    // to correctly calculate and render the dropdown options. 
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30); 
  }); 
    
  beforeEach(() => { 
    jest.clearAllMocks(); 
  }); 
    
  afterAll(() => { 
    jest.restoreAllMocks(); 
  });

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
    const container = await renderElement({ refId: 'A', queryType: QueryType.ListAlarms, filter: 'same-query' });
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'same-query' } };

    queryBuilder?.dispatchEvent(new CustomEvent('change', event));

    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).not.toHaveBeenCalled();
  });

  it('should call datasource.globalVariableOptions and render variable name when its filter is applied', async () => {
    const container = await renderElement({
      refId: 'A',
      queryType: QueryType.ListAlarms,
      filter: 'currentSeverityLevel = "$value1"',
    });

    expect(mockDatasource.globalVariableOptions).toHaveBeenCalled();
    expect(container.getByText('$var1')).toBeInTheDocument();
  });

  it('should call loadWorkspaces and render workspace name when workspace filter is applied', async () => {
    const container = await renderElement({ refId: 'A', queryType: QueryType.ListAlarms, filter: 'workspace = "1"' });

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

  describe('Properties', () => {
    it('should render the selected alarm properties in the UI', async () => {
      await renderElement({ refId: 'A', queryType: QueryType.ListAlarms, properties: [AlarmsProperties.acknowledged] });

      expect(screen.getByText(AlarmsPropertiesOptions[AlarmsProperties.acknowledged].label)).toBeInTheDocument();
    });

    it('should call handleQueryChange with selected property when a property is selected', async () => {
      await renderElement();
      const propertiesControl = screen.getAllByRole('combobox')[0];

      await userEvent.click(propertiesControl);
      await select(propertiesControl, AlarmsPropertiesOptions[AlarmsProperties.acknowledged].label, {
        container: document.body,
      });

      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledTimes(1);
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: ['acknowledged'],
          }),
        );
      });
    });

    it('should display error message when all properties are removed', async () => {
      const propertyToBeSelected = AlarmsProperties.acknowledged;

      await renderElement({ refId: 'A', queryType: QueryType.ListAlarms, properties: [propertyToBeSelected] });
      const removePropertyButton = screen.getByRole('button', {
        name: `Remove ${AlarmsPropertiesOptions[propertyToBeSelected].label}`,
      });
      await userEvent.click(removePropertyButton);

      expect(screen.getByText('You must select at least one property.')).toBeInTheDocument();
      expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ properties: [] }));
    });
  });

  describe('Transition Inclusion', () => {
    it('should render the selected transition inclusion option in the UI', async () => {
      const container = await renderElement({
        refId: 'A',
        queryType: QueryType.ListAlarms,
        transitionInclusionOption: TransitionInclusionOption.MostRecentOnly,
      });
      const transitionInclusionCombobox = container.getByRole('combobox', { name: 'Include Transition' });

      expect(transitionInclusionCombobox).toBeInTheDocument();
      expect(transitionInclusionCombobox).toHaveValue(AlarmsTransitionInclusionOptions[TransitionInclusionOption.MostRecentOnly].label);
    });

    it('should call handleQueryChange with selected transition inclusion option when it is updated in the UI', async () => {
      const container = await renderElement();
      const transitionInclusionCombobox = container.getByRole('combobox', { name: 'Include Transition' });

      await userEvent.click(transitionInclusionCombobox);
      await select(transitionInclusionCombobox, AlarmsTransitionInclusionOptions[TransitionInclusionOption.All].label, {
        container: document.body,
      });

      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledTimes(1);
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({
            transitionInclusionOption: TransitionInclusionOption.All,
          }),
        );
      });
    });
  });
});
