import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { OrderByOptions, OutputType, WorkItemPropertiesOptions, WorkItemsVariableQueryType, WorkItemTypeOptions } from './types';

describe('WorkItemsDataSource', () => {
  it('should apply expected default query values', () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);

    const query = datasource.prepareQuery({ refId: 'A' });

    expect(query.outputType).toBe(OutputType.Properties);
    expect(query.types).toEqual(Object.values(WorkItemTypeOptions));
    expect(query.properties).toEqual([
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.ASSIGNED_TO,
      WorkItemPropertiesOptions.PLANNED_START_DATE,
      WorkItemPropertiesOptions.DUE_DATE,
    ]);
    expect(query.orderBy).toBe(OrderByOptions.UPDATED_AT);
    expect(query.descending).toBe(true);
    expect(query.take).toBe(1000);
  });

  it('should test datasource connection against the work-items service endpoint', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({} as any);

    const result = await datasource.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 }, { showErrorAlert: false });
    expect(result.status).toBe('success');
  });

  it('should bubble up exception when datasource connectivity check fails', async () => {
    const [datasource] = setupDataSource(WorkItemsDataSource);
    jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Failed'));

    await expect(datasource.testDatasource()).rejects.toThrow('Failed');
  });

  describe('metricFindQuery', () => {
    it('should return the list of work item types when the query type is list work item types', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItemTypes },
        {} as any
      );

      expect(result).toEqual([
        { text: 'Work orders', value: WorkItemTypeOptions.WorkOrders },
        { text: 'Test plans', value: WorkItemTypeOptions.TestPlans },
        { text: 'Job', value: WorkItemTypeOptions.Job },
        { text: 'Maintenance', value: WorkItemTypeOptions.Maintenance },
        { text: 'Calibration', value: WorkItemTypeOptions.Calibration },
        { text: 'Reservation', value: WorkItemTypeOptions.Reservation },
        { text: 'Transport Order', value: WorkItemTypeOptions.TransportOrder },
      ]);
    });

    // TODO: AB#3923375 - Update once work items querying is implemented.
    it('should return an empty list for the list work items query type', async () => {
      const [datasource] = setupDataSource(WorkItemsDataSource);

      const result = await datasource.metricFindQuery(
        { refId: 'A', queryType: WorkItemsVariableQueryType.ListWorkItems },
        {} as any
      );

      expect(result).toEqual([]);
    });
  });
});
