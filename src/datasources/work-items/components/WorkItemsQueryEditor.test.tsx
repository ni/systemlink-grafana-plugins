import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupRenderer } from 'test/fixtures';
import { labels, propertiesErrorMessages, takeErrorMessages, typesErrorMessages } from '../constants/QueryEditor.constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from '../types';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';

describe('WorkItemsQueryEditor', () => {
  it('renders controls', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});

    expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeTruthy();
    expect(screen.getByRole('radio', { name: OutputType.TotalCount })).toBeTruthy();
    expect(screen.getByText(labels.types)).toBeTruthy();
    expect(screen.getAllByText(labels.properties)[1]).toBeTruthy();
    expect(screen.getByText(labels.orderBy)).toBeTruthy();
    expect(screen.getByText(labels.descending)).toBeTruthy();
    expect(screen.getByText(labels.take)).toBeTruthy();
  });

  it('hides properties-only controls for total count output', async () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});
    await userEvent.click(screen.getByRole('radio', { name: OutputType.TotalCount }));

    expect(screen.getAllByText(labels.properties)).toHaveLength(1);
    expect(screen.queryByText(labels.orderBy)).toBeNull();
    expect(screen.queryByText(labels.descending)).toBeNull();
    expect(screen.queryByText(labels.take)).toBeNull();
  });

  it('renders default selected properties for properties output', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});

    expect(screen.getByText('Work item ID')).toBeTruthy();
    expect(screen.getAllByText(labels.properties)[1]).toBeTruthy();
  });

  describe('validation', () => {
    it('shows types validation error when all types are removed instead of restoring the default selection', async () => {
      const offsetHeightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);

      try {
        const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);
        const [onChange] = render({ types: [WorkItemTypeOptions.WorkOrders] });

        await userEvent.click(screen.getByRole('button', { name: 'Remove Work orders' }));

        expect(screen.getByText(typesErrorMessages.atLeastOneRequired)).toBeTruthy();
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

        await userEvent.click(screen.getByRole('button', { name: 'Remove Work item ID' }));

        expect(screen.getByText(propertiesErrorMessages.atLeastOneRequired)).toBeTruthy();
        expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ properties: [] }));

        const propertiesCombobox = screen.getAllByRole('combobox')[1];
        await userEvent.click(propertiesCombobox);
        await userEvent.type(propertiesCombobox, 'Work item name');
        await userEvent.click(await screen.findByRole('option', { name: 'Work item name' }));

        expect(screen.queryByText(propertiesErrorMessages.atLeastOneRequired)).toBeNull();
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
      const takeInput = screen.getByRole('spinbutton');

      fireEvent.change(takeInput, { target: { value: '-5' } });
      fireEvent.blur(takeInput);

      expect(screen.getByText(takeErrorMessages.greaterOrEqualToZero)).toBeTruthy();
      expect(onChange).not.toHaveBeenCalled();
      expect(onRunQuery).not.toHaveBeenCalled();
    });
  });
});
