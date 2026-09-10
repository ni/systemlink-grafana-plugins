import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupRenderer } from 'test/fixtures';
import { propertiesErrorMessages, takeErrorMessages, typesErrorMessages } from '../constants/QueryEditor.constants';
import { CUSTOM_PROPERTY_SUFFIX, TAKE_LIMIT } from '../constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OutputType, WorkItemPropertiesGroup, WorkItemPropertiesOptions, WorkItemTypeOptions } from '../types';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';
import { workItemsQueryEditorPage as page } from './WorkItemsQueryEditor.page';

// The smart-webcomponents query builder is prohibitively slow to mount in jsdom,
// which pushes every asynchronous assertion in this file past the Jest timeout.
jest.mock('./query-builder/WorkItemsQueryBuilder', () => ({
  WorkItemsQueryBuilder: jest.fn(
    () => React.createElement(
      'div', 
      { 'data-testid': 'mock-work-items-query-builder' }
    )
    ),
}));

describe('WorkItemsQueryEditor', () => {
  let getCustomPropertyOptionsSpy: jest.SpyInstance;

  beforeEach(() => {
    getCustomPropertyOptionsSpy = jest
      .spyOn(WorkItemsDataSource.prototype, 'getCustomPropertyOptions')
      .mockResolvedValue([]);
  });

  afterEach(() => {
    getCustomPropertyOptionsSpy.mockRestore();
  });

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
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: -5 }));
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('should show a take validation error and suppress query execution when take exceeds the maximum limit', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});

      page.setTakeLimit(`${TAKE_LIMIT + 1}`);

      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeVisible();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: TAKE_LIMIT + 1 }));
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

    it('should show the take validation error on render when the saved query take is not positive', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ take: -5 });

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
    });

    it('should show the take validation error on render when the saved query take exceeds the maximum limit', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ take: TAKE_LIMIT + 1 });

      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeVisible();
    });
  });

  describe('custom properties', () => {
    const customPropertyOption = (key: string) => ({
      label: key,
      value: `${key}${CUSTOM_PROPERTY_SUFFIX}`,
      group: WorkItemPropertiesGroup.CUSTOM_PROPERTIES,
    });

    it('should load the custom property options when the output type is properties', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ outputType: OutputType.Properties, filter: 'type = "workorder"', take: 500 });

      await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalledWith('type = "workorder"', 500));
    });

    it('should not load the custom property options when the output type is total count', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ outputType: OutputType.TotalCount });

      await waitFor(() => expect(page.propertiesMultiCombobox()).toBeNull());
      expect(getCustomPropertyOptionsSpy).not.toHaveBeenCalled();
    });

    it('should list each custom property as its own option in the properties dropdown', async () => {
      const offsetHeightSpy = jest.spyOn(
        HTMLElement.prototype, 
        'offsetHeight', 'get'
      ).mockReturnValue(30);
      
      getCustomPropertyOptionsSpy.mockResolvedValue([
        customPropertyOption('customProperty1'),
        customPropertyOption('customProperty2'),
      ]);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ properties: [WorkItemPropertiesOptions.NAME] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());

        const propertiesCombobox = page.propertiesMultiCombobox()!;
        fireEvent.click(propertiesCombobox);
        fireEvent.change(propertiesCombobox, { target: { value: 'customProperty1' } });

        expect(await page.propertySelectOption('customProperty1')).toBeInTheDocument();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should not offer the lump custom properties option in the properties dropdown', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ properties: [WorkItemPropertiesOptions.NAME] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());

        const propertiesCombobox = page.propertiesMultiCombobox()!;
        fireEvent.click(propertiesCombobox);
        fireEvent.change(propertiesCombobox, { target: { value: 'Custom properties' } });

        expect(screen.queryByRole('option', { name: 'Custom properties' })).toBeNull();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should store a selected custom property in customProperties instead of properties', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange, onRunQuery] = render({ properties: [WorkItemPropertiesOptions.NAME] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());

        const propertiesCombobox = page.propertiesMultiCombobox()!;
        fireEvent.click(propertiesCombobox);
        // The dropdown is virtualized, so the custom property has to be filtered into view before it can be clicked.
        fireEvent.change(propertiesCombobox, { target: { value: 'customProperty1' } });
        fireEvent.click(await page.propertySelectOption('customProperty1'));

        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({
            properties: [WorkItemPropertiesOptions.NAME],
            customProperties: ['customProperty1'],
          })
        );
        expect(onRunQuery).toHaveBeenCalled();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should keep the saved custom property selected when the editor renders', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ properties: [], customProperties: ['customProperty1'] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());

        expect(page.removeOptionButton('customProperty1')).toBeInTheDocument();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should not show the at-least-one-property error when only a custom property is selected', async () => {
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ properties: [], customProperties: ['customProperty1'] });

      await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());
      expect(page.getErrorByMessage(propertiesErrorMessages.atLeastOneRequired)).toBeNull();
    });

    it('should show the at-least-one-property error when both standard and custom properties are empty', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ properties: [], customProperties: [] });

      await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());
      expect(page.getErrorByMessage(propertiesErrorMessages.atLeastOneRequired)).toBeVisible();
    });

    it('should show an invalid selection error when a saved custom property no longer exists', async () => {
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ properties: [WorkItemPropertiesOptions.NAME], customProperties: ['removedProperty'] });

      expect(
        await screen.findByText("The following selected custom property is not valid: 'removedProperty'")
      ).toBeVisible();
    });

    it('should pluralize the invalid selection error when several saved custom properties no longer exist', async () => {
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({
        properties: [WorkItemPropertiesOptions.NAME],
        customProperties: ['removedProperty1', 'removedProperty2'],
      });

      expect(
        await screen.findByText(
          "The following selected custom properties are not valid: 'removedProperty1, removedProperty2'"
        )
      ).toBeVisible();
    });

    it('should not show an invalid selection error when every saved custom property still exists', async () => {
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ properties: [WorkItemPropertiesOptions.NAME], customProperties: ['customProperty1'] });

      await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());
      expect(screen.queryByText(/is not valid/)).toBeNull();
    });

    it('should show no custom property options when loading them fails', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
      getCustomPropertyOptionsSpy.mockRejectedValue(new Error('Request failed'));

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ properties: [WorkItemPropertiesOptions.NAME] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());

        const propertiesCombobox = page.propertiesMultiCombobox()!;
        fireEvent.click(propertiesCombobox);
        fireEvent.change(propertiesCombobox, { target: { value: 'customProperty1' } });

        expect(screen.queryByRole('option', { name: 'customProperty1' })).toBeNull();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });
  });
});
