import { screen } from '@testing-library/react';
import { setupRenderer } from 'test/fixtures';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { WorkItemsQueryEditor } from './WorkItemsQueryEditor';

describe('WorkItemsQueryEditor', () => {
  it('shows placeholder message', () => {
    const render = setupRenderer(WorkItemsQueryEditor, WorkItemsDataSource);

    render({});

    expect(screen.getByText('Work Items datasource query controls will be added in follow-up stories.')).toBeInTheDocument();
  });
});
