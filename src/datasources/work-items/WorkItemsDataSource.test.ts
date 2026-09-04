import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';
import { OrderByOptions, OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';

describe('WorkItemsDataSource', () => {
  let datasource: WorkItemsDataSource;
  let templateSrv: any;

  beforeEach(() => {
    [datasource,, templateSrv] = setupDataSource(WorkItemsDataSource);
  });

  it('should apply expected default query values', () => {
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
    const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({} as any);

    const result = await datasource.testDatasource();

    expect(postSpy).toHaveBeenCalledWith('/niworkitem/v1/query-workitems', { take: 1 }, { showErrorAlert: false });
    expect(result.status).toBe('success');
  });

  it('should bubble up exception when datasource connectivity check fails', async () => {
    jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Failed'));

    await expect(datasource.testDatasource()).rejects.toThrow('Failed');
  });

  describe('runQuery', () => {
    it('should combine the type filter and the queryBy filter', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders, WorkItemTypeOptions.TestPlans],
        filter: 'state = "NEW"',
      };

      await datasource.runQuery(query, { scopedVars: {} } as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        {
          filter: 'type = "workorder" || type = "testplan" && state = "NEW"',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    describe('Total count output type', () => {
      it('should return the total count when outputType is TotalCount', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 42 });

        const query = { refId: 'A', outputType: OutputType.TotalCount };
        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [{ name: 'A', values: [42] }],
        });
      });

      it('should return 0 as total count when the API returns no totalCount', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({});
        const query = { refId: 'A', outputType: OutputType.TotalCount };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'A', values: [0] }]);
      });
    });

    describe('Properties output type', () => {
      it('should return an empty fields array when outputType is Properties', async () => {
        const query = { refId: 'A', outputType: OutputType.Properties };
        const result = await datasource.runQuery(query, {} as DataQueryRequest);
        
        expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      });
    });
    
    it('should replace template variables in the queryBy filter', async () => {
      jest.spyOn(templateSrv, 'replace').mockReturnValue('state = "NEW"');
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });

      const query = { refId: 'A', outputType: OutputType.TotalCount, filter: 'state = "$state"' };
      const scopedVars = { state: { text: 'NEW', value: 'NEW' } };
      await datasource.runQuery(query, { scopedVars } as unknown as DataQueryRequest);

      expect(templateSrv.replace).toHaveBeenCalledWith('state = "$state"', scopedVars);
      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        { filter: 'state = "NEW"', take: 0, returnCount: true },
        { showErrorAlert: false }
      );
    });


    it('should surface an error message when the total count request fails', async () => {
      jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Request failed with status code: 404'));

      const query = { refId: 'A', outputType: OutputType.TotalCount };

      await expect(datasource.runQuery(query, {} as DataQueryRequest)).rejects.toThrow(
        'The query to fetch work items failed because the requested resource was not found. Please check the query parameters and try again.'
      );
    });
  });

  describe('shouldRunQuery', () => {
    it('should return true when the query is not hidden', () => {
      const query = { refId: 'A', hide: false };

      const shouldRunQueryResult = datasource.shouldRunQuery(query);

      expect(shouldRunQueryResult).toBe(true);
    });

    it('should return false when the query is hidden', () => {
      const query = { refId: 'A', hide: true };

      const shouldRunQueryResult = datasource.shouldRunQuery(query);

      expect(shouldRunQueryResult).toBe(false);
    });
  });
});

