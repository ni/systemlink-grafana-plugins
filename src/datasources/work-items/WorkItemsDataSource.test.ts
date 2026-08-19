import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { OrderByOptions, OutputType, WorkItemTypeOptions } from './types';

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

  it('normalizes invalid types and preserves explicit take values', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const query = ds.prepareQuery({
      refId: 'A',
      types: [],
      take: 12000,
    });

    expect(query.types).toEqual([WorkItemTypeOptions.All]);
    expect(query.take).toBe(12000);
  });

  it('defaults take when it is negative or not finite', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const negativeTakeQuery = ds.prepareQuery({ refId: 'A', take: -1 });
    const nanTakeQuery = ds.prepareQuery({ refId: 'A', take: Number.NaN });

    expect(negativeTakeQuery.take).toBe(1000);
    expect(nanTakeQuery.take).toBe(1000);
  });

  it('returns a placeholder frame', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const result = await ds.runQuery({ refId: 'A' }, { scopedVars: {} } as any);
    expect(result.fields[0].name).toBe('message');
  });

  it('tests datasource connection against the work-items service endpoint', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);
    const postSpy = jest.spyOn(ds, 'post').mockResolvedValue({} as any);

    const result = await ds.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 });
    expect(result.status).toBe('success');
  });

  it('bubbles up exception when datasource connectivity check fails', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(ds, 'post').mockRejectedValue(new Error('Failed'));

    await expect(ds.testDatasource()).rejects.toThrow('Failed');
  });
});
