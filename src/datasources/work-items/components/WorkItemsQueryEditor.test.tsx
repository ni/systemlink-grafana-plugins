import { fireEvent } from '@testing-library/react';
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

    expect(page.outputTypeRadio(OutputType.Properties)).toBeInTheDocument();
    expect(page.outputTypeRadio(OutputType.TotalCount)).toBeInTheDocument();
    expect(page.typesCombobox()).toBeVisible();
    expect(page.propertiesCombobox()).toBeVisible();
    expect(page.orderByCombobox()).toBeVisible();
    expect(page.descendingSwitch()).toBeInTheDocument();
    expect(page.takeInputQuery()).toBeVisible();
  });

  it('hides properties-only controls for total count output', async () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});
    await userEvent.click(page.outputTypeRadio(OutputType.TotalCount));

    expect(page.propertiesCombobox()).toBeNull();
    expect(page.orderByCombobox()).toBeNull();
    expect(page.descendingSwitch()).toBeNull();
    expect(page.takeInputQuery()).toBeNull();
  });

  it('renders default selected properties for properties output', async () => {
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

    try {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      render({});

      const propertiesCombobox = page.propertiesCombobox()!;
      const checkedLabels = ['Work item name', 'State', 'Assigned to', 'Planned start date', 'Due date'];

      fireEvent.click(propertiesCombobox);
      for (const label of checkedLabels) {
        fireEvent.change(propertiesCombobox, { target: { value: label } });
        expect(page.propertyCheckbox(label)).toBeChecked();
      }

      fireEvent.change(propertiesCombobox, { target: { value: 'Work item ID' } });
      expect(page.propertyCheckbox('Work item ID')).not.toBeChecked();
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

        expect(page.typesErrorMessage()).toBeVisible();
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

        expect(page.propertiesErrorMessage()).toBeVisible();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ properties: [] }));

        const propertiesCombobox = page.propertiesCombobox()!;
        await userEvent.click(propertiesCombobox);
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

      expect(page.errorMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('shows take validation error and suppresses query execution when take exceeds the maximum limit', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});
      const takeInput = page.takeInput();

      fireEvent.change(takeInput, { target: { value: `${TAKE_LIMIT + 1}` } });
      fireEvent.blur(takeInput);

      expect(page.errorMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeVisible();
      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('clears the take validation error and runs the query when a valid take value is entered', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});
      const takeInput = page.takeInput();

      fireEvent.change(takeInput, { target: { value: '-5' } });
      fireEvent.blur(takeInput);
      expect(page.errorMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();

      fireEvent.change(takeInput, { target: { value: '500' } });
      fireEvent.blur(takeInput);

      expect(page.errorMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: 500 }));
      expect(onRunQuery).toHaveBeenCalled();
    });
  });
});
