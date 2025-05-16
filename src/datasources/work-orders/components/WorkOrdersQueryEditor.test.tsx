import { setupRenderer } from 'test/fixtures';
import { screen, waitFor } from '@testing-library/react';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQueryEditor } from './WorkOrdersQueryEditor';
import { WorkOrdersQuery } from '../types';

const render = setupRenderer(WorkOrdersQueryEditor, WorkOrdersDataSource);
describe('WorkOrdersQueryEditor', () => {
  beforeEach(async () => {
    render({ refId: '' } as WorkOrdersQuery);
  });

  it('renders the query builder', async () => {
    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
  });
});
