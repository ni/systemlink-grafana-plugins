import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { OrderByOptions, OutputType, TAKE_LIMIT, WorkItemTypeOptions } from './types';

describe('WorkItemsDataSource', () => {
  it('applies expected default query values', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const query = ds.prepareQuery({ refId: 'A' });

    expect(query.outputType).toBe(OutputType.Properties);
    expect(query.types).toEqual([WorkItemTypeOptions.All]);
    expect(query.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(query.descending).toBe(true);
    expect(query.take).toBe(1000);
  });

  it('normalizes invalid types and take values', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const query = ds.prepareQuery({
      refId: 'A',
      types: [],
      take: 12000,
    });

    expect(query.types).toEqual([WorkItemTypeOptions.All]);
    expect(query.take).toBe(TAKE_LIMIT);
  });

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

  it('exposes global variable options for the query builder', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    expect(Array.isArray(ds.globalVariableOptions())).toBe(true);
  });
});
