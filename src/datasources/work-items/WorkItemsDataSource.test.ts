import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { OrderByOptions, OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';

describe('WorkItemsDataSource', () => {
  it('applies expected default query values', () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const query = datasource.prepareQuery({ refId: 'A' });

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
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const clearedQuery = datasource.prepareQuery({
      refId: 'A',
      types: [],
      properties: [],
      take: 12000,
    });

    expect(clearedQuery.types).toEqual([]);
    expect(clearedQuery.properties).toEqual([]);
    expect(clearedQuery.take).toBe(12000);
  });

  it('tests datasource connection against the work-items service endpoint', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({} as any);

    const result = await datasource.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 }, { showErrorAlert: false });
    expect(result.status).toBe('success');
  });

  it('bubbles up exception when datasource connectivity check fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Failed'));

    await expect(datasource.testDatasource()).rejects.toThrow('Failed');
  });
});
