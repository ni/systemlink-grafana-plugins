import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupRenderer } from 'test/fixtures';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OutputType } from '../types';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';

describe('WorkItemsQueryEditor', () => {
  it('renders controls and initializes query', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    const [onChange, onRunQuery] = render({});

    expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: OutputType.TotalCount })).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
    expect(screen.getByText('OrderBy')).toBeInTheDocument();
    expect(screen.getByText('Descending')).toBeInTheDocument();
    expect(screen.getByText('Take')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ init: true }));
    expect(onRunQuery).toHaveBeenCalled();
  });

  it('hides properties-only controls for total count output', async () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});
    await userEvent.click(screen.getByRole('radio', { name: OutputType.TotalCount }));

    expect(screen.queryByText('OrderBy')).not.toBeInTheDocument();
    expect(screen.queryByText('Descending')).not.toBeInTheDocument();
    expect(screen.queryByText('Take')).not.toBeInTheDocument();
  });
});
