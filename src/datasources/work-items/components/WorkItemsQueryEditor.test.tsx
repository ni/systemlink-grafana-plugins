import { fireEvent } from '@testing-library/react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupRenderer } from 'test/fixtures';
import { takeErrorMessages } from '../constants/QueryEditor.constants';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OutputType } from '../types';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';

describe('WorkItemsQueryEditor', () => {
  it('renders controls', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});

    expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeTruthy();
    expect(screen.getByRole('radio', { name: OutputType.TotalCount })).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('OrderBy')).toBeTruthy();
    expect(screen.getByText('Descending')).toBeTruthy();
    expect(screen.getByText('Take')).toBeTruthy();
  });

  it('hides properties-only controls for total count output', async () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});
    await userEvent.click(screen.getByRole('radio', { name: OutputType.TotalCount }));

    expect(screen.queryByText('OrderBy')).toBeNull();
    expect(screen.queryByText('Descending')).toBeNull();
    expect(screen.queryByText('Take')).toBeNull();
  });

  it('shows take validation error and suppresses query execution for invalid take input', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    const [onChange, onRunQuery] = render({});
    const takeInput = screen.getByRole('spinbutton');

    fireEvent.change(takeInput, { target: { value: '-5' } });
    fireEvent.blur(takeInput);

    expect(screen.getByText(takeErrorMessages.greaterOrEqualToZero)).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ take: -5 }));
    expect(onRunQuery).not.toHaveBeenCalled();
  });
});
