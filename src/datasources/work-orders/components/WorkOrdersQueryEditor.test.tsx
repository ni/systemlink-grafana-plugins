import { setupRenderer } from 'test/fixtures';
import { screen } from '@testing-library/react';
import { WorkOrdersQuery } from '../types';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQueryEditor } from './WorkOrdersQueryEditor';

const render = setupRenderer(WorkOrdersQueryEditor, WorkOrdersDataSource);

describe('WorkOrdersQueryEditor', () => {
  it('renders with query defaults', async () => {
    render({} as WorkOrdersQuery);

    expect(screen.getByText('Placeholder for querybuilder')).toBeInTheDocument();
  });
});
