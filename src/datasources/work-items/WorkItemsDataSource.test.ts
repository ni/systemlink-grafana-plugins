import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';

describe('WorkItemsDataSource', () => {
  it('returns a placeholder frame', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const result = await ds.runQuery({ refId: 'A' }, { scopedVars: {} } as any);
    expect(result.fields[0].name).toBe('message');
  });

  it('tests datasource connection against the work-items service endpoint', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);
    const postSpy = jest.spyOn(ds, 'post').mockResolvedValue({} as any);

    const result = await ds.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 }, { showErrorAlert: false });
    expect(result.status).toBe('success');
  });
});
