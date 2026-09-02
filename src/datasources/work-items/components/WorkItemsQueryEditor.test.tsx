import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupRenderer } from 'test/fixtures';
import { propertiesErrorMessages, takeErrorMessages, typesErrorMessages } from '../constants/QueryEditor.constants';
import { TAKE_LIMIT } from '../constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from '../types';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';
import { workItemsQueryEditorPage as page } from './WorkItemsQueryEditor.page';

describe('WorkItemsQueryEditor', () => {
  it('should show all controls when the editor renders', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});

    expect(page.outputTypeRadioButton(OutputType.Properties)).toBeInTheDocument();
    expect(page.outputTypeRadioButton(OutputType.TotalCount)).toBeInTheDocument();
    expect(page.typesMultiCombobox()).toBeVisible();
    expect(page.propertiesMultiCombobox()).toBeVisible();
    expect(page.orderByCombobox()).toBeVisible();
    expect(page.descendingSwitch()).toBeInTheDocument();
    expect(page.optionalTakeLimitInput()).toBeVisible();
  });

  it('should hide properties-only controls when the output type is total count', async () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});
    await userEvent.click(page.outputTypeRadioButton(OutputType.TotalCount));

    expect(page.propertiesMultiCombobox()).toBeNull();
    expect(page.orderByCombobox()).toBeNull();
    expect(page.descendingSwitch()).toBeNull();
    expect(page.optionalTakeLimitInput()).toBeNull();
  });

  it('should show default selected properties when the output type is properties', async () => {
    const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

    try {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      render({});

      const propertiesCombobox = page.propertiesMultiCombobox()!;
      const checkedLabels = ['Work item name', 'State', 'Assigned to', 'Planned start date', 'Due date'];

      fireEvent.click(propertiesCombobox);
      for (const label of checkedLabels) {
        // fireEvent.change is used here to filter/search the dropdown options; it does not select or deselect them.
        fireEvent.change(propertiesCombobox, { target: { value: label } });
        expect(page.propertyOptionCheckbox(label)).toBeChecked();
      }

      fireEvent.change(propertiesCombobox, { target: { value: 'Work item ID' } });
      expect(page.propertyOptionCheckbox('Work item ID')).not.toBeChecked();
    } finally {
      offsetHeightSpy.mockRestore();
    }
  });

  describe('validation error', () => {
    it('should not show types, properties, or take validation errors when the editor renders', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({});

      expect(page.getErrorByMessage(typesErrorMessages.atLeastOneRequired)).toBeNull();
      expect(page.getErrorByMessage(propertiesErrorMessages.atLeastOneRequired)).toBeNull();
      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeNull();
    });

    it('should clear the types validation error when a type is re-added after all types are removed', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange, onRunQuery] = render({ types: [WorkItemTypeOptions.WorkOrders] });

        await userEvent.click(page.removeOptionButton('Work orders'));

        expect(page.getErrorByMessage(typesErrorMessages.atLeastOneRequired)).toBeVisible();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ types: [] }));
        expect(onRunQuery).not.toHaveBeenCalled();

        const typesCombobox = page.typesMultiCombobox()!;
        await userEvent.click(typesCombobox);
        await userEvent.click(await page.typeSelectOption('Work orders'));

        expect(page.getErrorByMessage(typesErrorMessages.atLeastOneRequired)).toBeNull();
        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ types: [WorkItemTypeOptions.WorkOrders] })
        );
        expect(onRunQuery).toHaveBeenCalled();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should clear the properties validation error when a property is re-added after all properties are removed', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange, onRunQuery] = render({ properties: [WorkItemPropertiesOptions.ID] });

        await userEvent.click(page.removeOptionButton('Work item ID'));

        expect(page.getErrorByMessage(propertiesErrorMessages.atLeastOneRequired)).toBeVisible();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ properties: [] }));
        expect(onRunQuery).not.toHaveBeenCalled();

        const propertiesCombobox = page.propertiesMultiCombobox()!;
        await userEvent.click(propertiesCombobox);
        await userEvent.click(await page.propertySelectOption('Work item name'));

        expect(page.getErrorByMessage(propertiesErrorMessages.atLeastOneRequired)).toBeNull();
        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ properties: [WorkItemPropertiesOptions.NAME] })
        );
        expect(onRunQuery).toHaveBeenCalled();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should show a take validation error and suppress query execution when take input is invalid', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});

      page.setTakeLimit('-5');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('should show a take validation error and suppress query execution when take exceeds the maximum limit', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});

      page.setTakeLimit(`${TAKE_LIMIT + 1}`);

      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeVisible();
      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('should clear the take validation error and run the query when a valid take value is entered', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});

      page.setTakeLimit('-5');
      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();

      page.setTakeLimit('500');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: 500 }));
      expect(onRunQuery).toHaveBeenCalled();
    });
  });
});
