import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupRenderer } from 'test/fixtures';
import { propertiesErrorMessages, takeErrorMessages } from '../constants/QueryEditor.constants';
import { CUSTOM_PROPERTY_SUFFIX, DEFAULT_TAKE, TAKE_LIMIT } from '../constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { 
  OrderByOptions, 
  OutputType, 
  WorkItemPropertiesGroup, 
  WorkItemPropertiesOptions, 
  WorkItemTypeOptions 
} from '../types';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';
import { workItemsQueryEditorPage as page } from './WorkItemsQueryEditor.page';

jest.mock('./query-builder/WorkItemsQueryBuilder', () => ({
  WorkItemsQueryBuilder: jest.fn(({ onChange }: { onChange?: (event: Event) => void }) => {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const node = ref.current;
      if (!node || !onChange) {
        return;
      }
      node.addEventListener('change', onChange);
      return () => node.removeEventListener('change', onChange);
    }, [onChange]);

    return React.createElement('div', {
      ref,
      'data-testid': 'mock-work-items-query-builder',
      role: 'dialog',
    });
  }),
}));

describe('WorkItemsQueryEditor', () => {
  it('should call onRunQuery on init', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    const [, onRunQuery] = render({});

    expect(onRunQuery).toHaveBeenCalledTimes(1);
  });

  let getCustomPropertyOptionsSpy: jest.SpyInstance;
  let loadWorkItemTypesSpy: jest.SpyInstance;

  beforeEach(() => {
    getCustomPropertyOptionsSpy = jest
      .spyOn(WorkItemsDataSource.prototype, 'getCustomPropertyOptions')
      .mockResolvedValue([]);
    loadWorkItemTypesSpy = jest
      .spyOn(WorkItemsDataSource.prototype, 'loadWorkItemTypes')
      .mockResolvedValue([
        { label: 'Work orders', value: 'workorder' },
        { label: 'Test plans', value: 'testplan' },
      ]);
  });

  afterEach(() => {
    getCustomPropertyOptionsSpy.mockRestore();
    loadWorkItemTypesSpy.mockRestore();
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

  describe('type control', () => {
    it('should not offer legacy type options before API types are loaded', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
      let resolveWorkItemTypes: (value: never[]) => void = () => {};
      loadWorkItemTypesSpy.mockReturnValue(new Promise(resolve => {
        resolveWorkItemTypes = resolve;
      }));

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ types: [] });

        fireEvent.click(page.typesMultiCombobox()!);

        expect(screen.queryByRole('option', { name: 'All' })).toBeNull();
        expect(screen.queryByRole('option', { name: 'Work orders' })).toBeNull();
        expect(screen.queryByRole('option', { name: 'Test plans' })).toBeNull();
        expect(screen.getByRole('option', { name: '$test_var' })).toBeInTheDocument();
      } finally {
        resolveWorkItemTypes([]);
        offsetHeightSpy.mockRestore();
      }
    });

    it('should offer dashboard variables as options in the type control', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange, onRunQuery] = render({ types: [WorkItemTypeOptions.WorkOrders] });
        onChange.mockClear();
        onRunQuery.mockClear();

        await waitFor(() => expect(loadWorkItemTypesSpy).toHaveBeenCalled());
        const typesCombobox = page.typesMultiCombobox()!;
        fireEvent.click(typesCombobox);
        fireEvent.change(typesCombobox, { target: { value: '$test_var' } });
        expect(await page.typeSelectOption('$test_var')).toBeInTheDocument();

        await userEvent.click(await page.typeSelectOption('$test_var'));

        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ types: ['workorder', '$test_var'] })
        );
        expect(onRunQuery).toHaveBeenCalled();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });
  });

  describe('query by filter change', () => {
    it('should call onChange and onRunQuery when the filter value changes', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      const [onChange, onRunQuery] = render({});
      onRunQuery.mockClear();
      onChange.mockClear();

      page.queryBuilderDialog().dispatchEvent(new CustomEvent('change', { detail: { linq: 'name = "test"' } }));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ filter: 'name = "test"' }));
      expect(onRunQuery).toHaveBeenCalled();
    });

    it('should not call onChange or onRunQuery when the filter event repeats the same value', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      const [onChange, onRunQuery] = render({ filter: 'name = "test"' });
      onRunQuery.mockClear();
      onChange.mockClear();

      page.queryBuilderDialog().dispatchEvent(new CustomEvent('change', { detail: { linq: 'name = "test"' } }));

      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('should call onChange and onRunQuery only once when the query builder fires duplicate change events for the same new value', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      const [onChange, onRunQuery] = render({});
      onRunQuery.mockClear();
      onChange.mockClear();

      const dialog = page.queryBuilderDialog();
      dialog.dispatchEvent(new CustomEvent('change', { detail: { linq: 'name = "test"' } }));
      dialog.dispatchEvent(new CustomEvent('change', { detail: { linq: 'name = "test"' } }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onRunQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation error', () => {
    it('should not show properties or take validation errors when the editor renders', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({});

      expect(page.getErrorByMessage(propertiesErrorMessages.atLeastOneRequired)).toBeNull();
      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeNull();
      expect(page.getErrorByMessage(takeErrorMessages.lessOrEqualToTenThousand)).toBeNull();
    });

    it('should query all types when every selected type is removed and update types when one is re-added', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange, onRunQuery] = render({ types: [WorkItemTypeOptions.WorkOrders] });
        onRunQuery.mockClear();

        const removeWorkOrderButton =
          screen.queryByRole('button', { name: 'Remove workorder' }) ?? page.removeOptionButton('Work orders');
        await userEvent.click(removeWorkOrderButton);

        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ types: [] }));
        expect(onRunQuery).toHaveBeenCalled();

        const typesCombobox = page.typesMultiCombobox()!;
        await waitFor(() => expect(loadWorkItemTypesSpy).toHaveBeenCalled());
        fireEvent.click(typesCombobox);
        fireEvent.change(typesCombobox, { target: { value: 'Work orders' } });
        await userEvent.click(await page.typeSelectOption('Work orders'));

        expect(onChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ types: ['workorder'] })
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
        onRunQuery.mockClear();

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
      onRunQuery.mockClear();

      page.setTakeLimit('-5');

      expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible();
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: -5 }));
      expect(onRunQuery).not.toHaveBeenCalled();
    });

    it('should show a take validation error and suppress query execution when take exceeds the maximum limit', () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      const [onChange, onRunQuery] = render({});
      onRunQuery.mockClear();

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

      await waitFor(() =>
        expect(getCustomPropertyOptionsSpy).toHaveBeenCalledWith(
          '(type = "workorder")',
          500,
          OrderByOptions.UPDATED_AT,
          true
        )
      );
    });

    it('should reload the custom property options when orderBy or descending changes', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      render({ outputType: OutputType.Properties, orderBy: OrderByOptions.UPDATED_AT, descending: true });

      await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalledTimes(1));
      getCustomPropertyOptionsSpy.mockClear();

      await userEvent.click(page.descendingSwitch()!);

      await waitFor(() =>
        expect(getCustomPropertyOptionsSpy).toHaveBeenLastCalledWith(
          undefined,
          DEFAULT_TAKE,
          OrderByOptions.UPDATED_AT,
          false
        )
      );
    });

    it('should not reload the custom property options when switching output type back to properties without other changes', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
      render({ outputType: OutputType.Properties });

      await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalledTimes(1));
      getCustomPropertyOptionsSpy.mockClear();

      await userEvent.click(page.outputTypeRadioButton(OutputType.TotalCount));
      await userEvent.click(page.outputTypeRadioButton(OutputType.Properties));

      expect(getCustomPropertyOptionsSpy).not.toHaveBeenCalled();
    });

    it('should not load the custom property options when the output type is total count', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ outputType: OutputType.TotalCount });

      await waitFor(() => expect(page.propertiesMultiCombobox()).toBeNull());
      expect(getCustomPropertyOptionsSpy).not.toHaveBeenCalled();
    });

    it('should load the custom property options when no types are selected', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ types: [] });

      await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());
    });

    it('should clear the discovered custom property options when the query becomes invalid', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ outputType: OutputType.Properties, types: [WorkItemTypeOptions.WorkOrders] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalledTimes(1));

        const [onChange] = render({ outputType: OutputType.Properties, take: -1 });
        await waitFor(() => expect(page.getErrorByMessage(takeErrorMessages.greaterOrEqualToZero)).toBeVisible());

        expect(screen.queryByRole('option', { name: 'customProperty1' })).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
        expect(getCustomPropertyOptionsSpy).toHaveBeenCalledTimes(1);
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should not load the custom property options when take is invalid', async () => {
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ take: -5 });

      await waitFor(() => expect(page.getErrorByMessage(
          takeErrorMessages.greaterOrEqualToZero
        )).toBeVisible());
      expect(getCustomPropertyOptionsSpy).not.toHaveBeenCalled();
    });

    it('should rediscover custom property options when types are removed after a successful discovery', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ types: [WorkItemTypeOptions.WorkOrders] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());
        getCustomPropertyOptionsSpy.mockClear();

        await userEvent.click(page.removeOptionButton('Work orders'));

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());
      } finally {
        offsetHeightSpy.mockRestore();
      }
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
        fireEvent.change(propertiesCombobox, { target: { value: 'customProperty' } });

        expect(await page.propertySelectOption('customProperty1')).toBeInTheDocument();
        expect(await page.propertySelectOption('customProperty2')).toBeInTheDocument();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    // The old catch-all option for the entire custom properties bag should not be shown.
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

    it('should check the matching dropdown option for a saved custom property using its suffixed value', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
      getCustomPropertyOptionsSpy.mockResolvedValue([customPropertyOption('customProperty1')]);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        render({ properties: [], customProperties: ['customProperty1'] });

        await waitFor(() => expect(getCustomPropertyOptionsSpy).toHaveBeenCalled());

        const propertiesCombobox = page.propertiesMultiCombobox()!;
        fireEvent.click(propertiesCombobox);
        fireEvent.change(propertiesCombobox, { target: { value: 'customProperty1' } });

        // Only checked if the saved value (with the suffix appended) matches the discovered option's value.
        expect(page.propertyOptionCheckbox('customProperty1')).toBeChecked();
      } finally {
        offsetHeightSpy.mockRestore();
      }
    });

    it('should show the saved custom property label without the suffix before discovery finishes loading', () => {
      getCustomPropertyOptionsSpy.mockReturnValue(new Promise(() => {}));
      const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

      render({ properties: [], customProperties: ['customProperty1'] });

      // Falls back to a plain option before the discovered (suffixed) options are available;
      // the suffix must be stripped so the chip label reads 'customProperty1', not the raw suffixed value.
      expect(page.removeOptionButton('customProperty1')).toBeInTheDocument();
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
