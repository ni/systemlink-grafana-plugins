import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryType, TransitionInclusionOption } from 'datasources/alarms/types/types';
import { ListAlarmsQueryHandler } from 'datasources/alarms/query-type-handlers/list-alarms/ListAlarmsQueryHandler';
import { AlarmsProperties, ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';
import { ListAlarmsQueryEditor } from './ListAlarmsQueryEditor';
import userEvent from '@testing-library/user-event';
import { AlarmsPropertiesOptions, takeErrorMessages, AlarmsTransitionInclusionOptions } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
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

  describe('Take', () => {
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

      expect(mockHandleQueryChange).toHaveBeenCalledWith({
        refId: 'A',
        take: 250,
      });
    });

    it('should preserve other query properties when take changes', async () => {
      const initialQuery = { refId: 'A', filter: 'existing filter', descending: true };
      await renderElement(initialQuery);

      const takeInput = screen.getByRole('spinbutton');
      
      fireEvent.change(takeInput, { target: { value: '300' } });
      fireEvent.blur(takeInput);

      expect(mockHandleQueryChange).toHaveBeenCalledWith({
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

    it('should display maximum take error message when take value is above 10,000', async () => {
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

    it('should display transition max take error message when take value is above 500 with transition inclusion set to All', async () => {
      await renderElement({ refId: 'A', transitionInclusionOption: TransitionInclusionOption.All });

      const takeInput = screen.getByRole('spinbutton');

      fireEvent.change(takeInput, { target: { value: '5000' } });
      fireEvent.blur(takeInput);

      expect(screen.getByText(takeErrorMessages.transitionAllMaxErrorMsg)).toBeInTheDocument();
    });

    it('should display no error message when take value is less than or equal to 500 with transition inclusion set to All', async () => {
      await renderElement({ refId: 'A', transitionInclusionOption: TransitionInclusionOption.All });

      const takeInput = screen.getByRole('spinbutton');

      fireEvent.change(takeInput, { target: { value: '500' } });
      fireEvent.blur(takeInput);
      expect(screen.queryByText(takeErrorMessages.transitionAllMaxErrorMsg)).not.toBeInTheDocument();
    });
  });

  describe('Descending', () => {
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

      expect(mockHandleQueryChange).toHaveBeenCalledWith({
        refId: 'A',
        descending: true
      });
    });

    it('should preserve other query properties when descending changes', async () => {
      const initialQuery = { refId: 'A', filter: 'test filter', take: 500 };
      await renderElement(initialQuery);

      const descendingSwitch = screen.getByRole('switch');
      fireEvent.click(descendingSwitch);

      expect(mockHandleQueryChange).toHaveBeenCalledWith({
        refId: 'A',
        filter: 'test filter',
        take: 500,
        descending: true
      });
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
      expect(transitionInclusionCombobox).toHaveValue(
        AlarmsTransitionInclusionOptions[TransitionInclusionOption.MostRecentOnly].label
      );
    });

    it('should call handleQueryChange with selected transition inclusion option when it is updated in the UI', async () => {
      const container = await renderElement();
      const transitionInclusionCombobox = container.getByRole('combobox', { name: 'Include Transition' });

      await userEvent.click(transitionInclusionCombobox);
      await select(
        transitionInclusionCombobox,
        AlarmsTransitionInclusionOptions[TransitionInclusionOption.All].label,
        {
          container: document.body,
        }
      );

      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledTimes(1);
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({
            transitionInclusionOption: TransitionInclusionOption.All,
          }),
        );
      });
    });

    [TransitionInclusionOption.All, TransitionInclusionOption.MostRecentOnly].forEach((option) => {
      it(`should show transition properties in dropdown when transition inclusion is ${option}`, async () => {
        const container = await renderElement({
          refId: 'A',
          queryType: QueryType.ListAlarms,
          transitionInclusionOption: option,
        });

        const propertiesCombobox = container.getAllByRole('combobox')[0];
        await userEvent.click(propertiesCombobox);
        await userEvent.clear(propertiesCombobox);
        await userEvent.type(propertiesCombobox, 'Transition value');

        expect(screen.queryByText('Transition value')).toBeInTheDocument();
      });
    });

    it('should not show transition properties in dropdown when transition inclusion is None', async () => {
      const container = await renderElement({
        refId: 'A',
        queryType: QueryType.ListAlarms,
        transitionInclusionOption: TransitionInclusionOption.None,
      });

      const propertiesCombobox = container.getAllByRole('combobox')[0];
      await userEvent.click(propertiesCombobox);
      await userEvent.clear(propertiesCombobox);
      await userEvent.type(propertiesCombobox, 'Transition condition');

      expect(screen.queryByText('Transition condition')).not.toBeInTheDocument();
    });

    it('should remove transition properties from selected properties when transition inclusion is changed to None', async () => {
      await renderElement({
        refId: 'A',
        queryType: QueryType.ListAlarms,
        transitionInclusionOption: TransitionInclusionOption.All,
        properties: [ AlarmsProperties.acknowledged, AlarmsProperties.transitionCondition ],
      });

      const transitionInclusionCombobox = screen.getByRole('combobox', { name: 'Include Transition' });

      await userEvent.click(transitionInclusionCombobox);
      await select(
        transitionInclusionCombobox,
        AlarmsTransitionInclusionOptions[TransitionInclusionOption.None].label,
        {
          container: document.body,
        }
      );

      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledTimes(1);
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({
            transitionInclusionOption: TransitionInclusionOption.None,
            properties: [ AlarmsProperties.acknowledged ],
          }),
        );
      });
    });

    it('should display error if transition property is selected and transition inclusion option is updated to None', async () => {
      await renderElement({
        refId: 'A',
        queryType: QueryType.ListAlarms,
        transitionInclusionOption: TransitionInclusionOption.All,
        properties: [ AlarmsProperties.transitionCondition ],
      });

      const transitionInclusionCombobox = screen.getByRole('combobox', { name: 'Include Transition' });

      await userEvent.click(transitionInclusionCombobox);
      await select(transitionInclusionCombobox,
        AlarmsTransitionInclusionOptions[TransitionInclusionOption.None].label,
        {
          container: document.body,
        }
      );

      expect(screen.getByText('You must select at least one property.')).toBeInTheDocument();
    });
  });
});
