import { screen } from '@testing-library/react';
import { setupRenderer } from 'test/fixtures';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';

describe('WorkItemsQueryEditor', () => {
  it('shows placeholder message and initializes query', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    const [onChange, onRunQuery] = render({});

    expect(screen.getByText('Work Items datasource query controls will be added in follow-up stories.')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ init: true }));
    expect(onRunQuery).toHaveBeenCalled();
  });
});
