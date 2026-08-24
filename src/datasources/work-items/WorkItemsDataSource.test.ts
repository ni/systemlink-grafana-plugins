import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';

describe('WorkItemsDataSource', () => {
  it('returns an empty placeholder frame', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const result = await ds.runQuery({ refId: 'A' }, { scopedVars: {} } as any);
    expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
  });

  it('tests datasource connection against the work-items service endpoint', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);
    const postSpy = jest.spyOn(ds, 'post').mockResolvedValue({} as any);

    const result = await ds.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 }, { showErrorAlert: false });
    expect(result.status).toBe('success');
  });
});
