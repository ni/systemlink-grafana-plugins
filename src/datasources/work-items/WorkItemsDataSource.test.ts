import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { OrderByOptions, OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';
import { TAKE_LIMIT } from './constants/QueryEditor.constants';

describe('WorkItemsDataSource', () => {
  it('applies expected default query values', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const query = ds.prepareQuery({ refId: 'A' });

    expect(query.outputType).toBe(OutputType.Properties);
    expect(query.types).toEqual(Object.values(WorkItemTypeOptions));
    expect(query.properties).toEqual([
      WorkItemPropertiesOptions.ID,
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.TYPE,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.WORKSPACE,
    ]);
    expect(query.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(query.descending).toBe(true);
    expect(query.take).toBe(1000);
  });

  it('preserves explicit selections instead of resetting them to defaults', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    const clearedQuery = ds.prepareQuery({
      refId: 'A',
      types: [],
      properties: [],
      take: 12000,
    });

    expect(clearedQuery.types).toEqual([]);
    expect(clearedQuery.properties).toEqual([]);
    expect(clearedQuery.take).toBe(12000);
  });

  it('reports invalid types, properties and take values', () => {
    const [ds] = setupDataSource(WorkItemsDataSource);

    expect(ds.isTypesValid([])).toBe(false);
    expect(ds.isTypesValid([WorkItemTypeOptions.WorkOrders])).toBe(true);
    expect(ds.isPropertiesValid([])).toBe(false);
    expect(ds.isPropertiesValid([WorkItemPropertiesOptions.ID])).toBe(true);
    expect(ds.isTakeValid(-1)).toBe(false);
    expect(ds.isTakeValid(Number.NaN)).toBe(false);
    expect(ds.isTakeValid(TAKE_LIMIT + 1)).toBe(false);
    expect(ds.isTakeValid(TAKE_LIMIT)).toBe(true);
  });

  it('returns a placeholder frame', async () => {
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

  it('bubbles up exception when datasource connectivity check fails', async () => {
    const [ds] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(ds, 'post').mockRejectedValue(new Error('Failed'));

    await expect(ds.testDatasource()).rejects.toThrow('Failed');
  });
});
