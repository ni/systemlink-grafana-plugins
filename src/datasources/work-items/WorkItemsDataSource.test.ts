import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';

describe('WorkItemsDataSource', () => {
  it('returns a placeholder frame', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const result = await ds.runQuery({ refId: 'A' }, { scopedVars: {} } as any);
    expect(result.fields[0].name).toBe('message');
  });

  it('tests datasource connection against authenticated endpoint', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource, () => ({
      url: 'https://example.com',
    }));
    const getSpy = jest.spyOn(ds, 'get').mockResolvedValue({} as any);

    const result = await ds.testDatasource();

    expect(getSpy).toHaveBeenCalledWith('/niauth/v1/user');
    expect(result.status).toBe('success');
  });
});
