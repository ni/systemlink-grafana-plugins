import { fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupRenderer } from 'test/fixtures';
import { takeErrorMessages } from '../constants/QueryEditor.constants';
import { TAKE_LIMIT } from '../constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from '../types';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';
import { workItemsQueryEditorPage as page } from './WorkItemsQueryEditor.page';

describe('WorkItemsQueryEditor', () => {
  it('renders controls', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});

    expect(page.outputTypeRadio(OutputType.Properties)).toBeTruthy();
    expect(page.outputTypeRadio(OutputType.TotalCount)).toBeTruthy();
    expect(page.typesLabel()).toBeTruthy();
    expect(page.propertiesLabels()[1]).toBeTruthy();
    expect(page.orderByLabel()).toBeTruthy();
    expect(page.descendingLabel()).toBeTruthy();
    expect(page.takeLabel()).toBeTruthy();
  });

  it('hides properties-only controls for total count output', async () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});
    await userEvent.click(page.outputTypeRadio(OutputType.TotalCount));

    expect(page.propertiesLabels()).toHaveLength(1);
    expect(page.orderByLabel()).toBeNull();
    expect(page.descendingLabel()).toBeNull();
    expect(page.takeLabel()).toBeNull();
  });

  it('renders default selected properties for properties output', async () => {
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(400);

    try {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      render({});

      const propertiesCombobox = page.comboboxes()[1];
      await userEvent.click(propertiesCombobox);

      await waitFor(() => {
        expect(page.propertyCheckbox('Work item ID')).toBeChecked();
        expect(page.propertyCheckbox('Work item name')).toBeChecked();
        expect(page.propertyCheckbox('Work item type')).toBeChecked();
        expect(page.propertyCheckbox('State')).toBeChecked();
        expect(page.propertyCheckbox('Workspace')).toBeChecked();
        expect(page.propertyCheckbox('Substate')).not.toBeChecked();
      });
    } finally {
      offsetHeightSpy.mockRestore();
    }
  });

  describe('validation', () => {
    it('shows types validation error when all types are removed instead of restoring the default selection', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange] = render({ types: [WorkItemTypeOptions.WorkOrders] });

        await userEvent.click(page.removeButton('Work orders'));

        expect(page.typesErrorMessage()).toBeTruthy();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ types: [] }));
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('shows properties validation error when all properties are removed, and clears it (without restoring defaults) when a property is re-added', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange] = render({ properties: [WorkItemPropertiesOptions.ID] });

        await userEvent.click(page.removeButton('Work item ID'));

        expect(page.propertiesErrorMessage()).toBeTruthy();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ properties: [] }));

        const propertiesCombobox = page.comboboxes()[1];
        await userEvent.click(propertiesCombobox);
        await userEvent.type(propertiesCombobox, 'Work item name');
        await userEvent.click(await page.propertyOption('Work item name'));

        expect(page.propertiesErrorMessage()).toBeNull();
        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ properties: [WorkItemPropertiesOptions.NAME] })
        );
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('shows take validation error and suppresses query execution for invalid take input', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});
      const takeInput = page.takeInput();

      fireEvent.change(takeInput, { target: { value: '-5' } });
      fireEvent.blur(takeInput);

      expect(page.errorMessage(takeErrorMessages.greaterOrEqualToZero)).toBeTruthy();
      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('shows take validation error and suppresses query execution when take exceeds the maximum limit', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});
      const takeInput = page.takeInput();

      fireEvent.change(takeInput, { target: { value: `${TAKE_LIMIT + 1}` } });
      fireEvent.blur(takeInput);

      expect(page.errorMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeTruthy();
      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('clears the take validation error and runs the query when a valid take value is entered', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});
      const takeInput = page.takeInput();

      fireEvent.change(takeInput, { target: { value: '-5' } });
      fireEvent.blur(takeInput);
      expect(page.errorMessage(takeErrorMessages.greaterOrEqualToZero)).toBeTruthy();

      fireEvent.change(takeInput, { target: { value: '500' } });
      fireEvent.blur(takeInput);

      expect(page.errorMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: 500 }));
      expect(onRunQuery).toHaveBeenCalled();
    });
  });
});
