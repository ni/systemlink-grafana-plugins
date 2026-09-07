import { WorkItemsDataSource } from './WorkItemsDataSource';
import { setupDataSource } from 'test/fixtures';
import { DataQueryRequest } from '@grafana/data';
import { OrderByOptions, OutputType, WorkItemPropertiesOptions, WorkItemTypeOptions } from './types';
import { queryInBatches } from 'core/utils';

jest.mock('core/utils', () => ({
  ...jest.requireActual('core/utils'),
  queryInBatches: jest.fn(jest.requireActual('core/utils').queryInBatches),
}));

describe('WorkItemsDataSource', () => {
  let datasource: WorkItemsDataSource;

  beforeEach(() => {
    [datasource] = setupDataSource(WorkItemsDataSource);
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
    it('should return an empty data frame without querying when no types are selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post');
      const query = { refId: 'A', outputType: OutputType.TotalCount, types: [] };

      const result = await datasource.runQuery(query, {} as DataQueryRequest);

      expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
      expect(postSpy).not.toHaveBeenCalled();
    });

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
          filter: '(type = "workorder" || type = "testplan") && (state = "NEW")',
          take: 0,
          returnCount: true,
        },
        { showErrorAlert: false }
      );
    });

    it('should group each filter when one type is selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: [WorkItemTypeOptions.WorkOrders],
        filter: 'state = "NEW"',
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        { filter: '(type = "workorder") && (state = "NEW")', take: 0, returnCount: true },
        { showErrorAlert: false }
      );
    });

    it('should omit the type filter when all types are selected', async () => {
      const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 1 });
      const query = {
        refId: 'A',
        outputType: OutputType.TotalCount,
        types: Object.values(WorkItemTypeOptions),
      };

      await datasource.runQuery(query, {} as DataQueryRequest);

      expect(postSpy).toHaveBeenCalledWith(
        '/niworkitem/v1/query-workitems',
        { filter: undefined, take: 0, returnCount: true },
        { showErrorAlert: false }
      );
    });

    describe('properties output type', () => {
      it('should return basic properties mapped directly from the response', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              id: '1',
              name: 'Battery Cycle Test',
              type: 'testplan',
              state: 'NEW',
              substate: 'substate1',
              description: 'Battery cycle test at various temperatures.',
              parentId: '1000',
              templateId: '2000',
              testProgram: 'Battery cycle test',
              partNumber: '156502A-11L',
              createdAt: '2018-05-09T15:07:42.527921Z',
              updatedAt: '2018-05-09T15:07:42.527921Z',
              timeline: {
                earliestStartDateTime: '2018-05-19T15:07:42.527921Z',
                dueDateTime: '2018-05-23T15:07:42.527921Z',
              },
              schedule: {
                plannedStartDateTime: '2018-05-20T15:07:42.527921Z',
                plannedEndDateTime: '2018-05-22T15:07:42.527921Z',
              },
            },
          ],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.ID,
            WorkItemPropertiesOptions.NAME,
            WorkItemPropertiesOptions.TYPE,
            WorkItemPropertiesOptions.STATE,
            WorkItemPropertiesOptions.SUBSTATE,
            WorkItemPropertiesOptions.DESCRIPTION,
            WorkItemPropertiesOptions.TEST_PROGRAM,
            WorkItemPropertiesOptions.PART_NUMBER,
            WorkItemPropertiesOptions.PARENT_WORK_ITEM_ID,
            WorkItemPropertiesOptions.TEMPLATE_ID,
            WorkItemPropertiesOptions.CREATED_AT,
            WorkItemPropertiesOptions.UPDATED_AT,
            WorkItemPropertiesOptions.EARLIEST_START_DATE,
            WorkItemPropertiesOptions.DUE_DATE,
            WorkItemPropertiesOptions.PLANNED_START_DATE,
            WorkItemPropertiesOptions.PLANNED_END_DATE,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        const timeConfig = { unit: 'time:YYYY-MM-DD HH:mm:ss' };

        expect(result.fields).toEqual([
          { name: 'Work item ID', values: ['1'], type: 'string' },
          { name: 'Work item name', values: ['Battery Cycle Test'], type: 'string' },
          { name: 'Work item type', values: ['Test plan'], type: 'string' },
          { name: 'State', values: ['New'], type: 'string' },
          { name: 'Substate', values: ['substate1'], type: 'string' },
          { name: 'Description', values: ['Battery cycle test at various temperatures.'], type: 'string' },
          { name: 'Test program', values: ['Battery cycle test'], type: 'string' },
          { name: 'Part number', values: ['156502A-11L'], type: 'string' },
          { name: 'Parent work item ID', values: ['1000'], type: 'string' },
          { name: 'Template ID', values: ['2000'], type: 'string' },
          { name: 'Created at', values: ['2018-05-09T15:07:42.527921Z'], type: 'time', config: timeConfig },
          { name: 'Updated at', values: ['2018-05-09T15:07:42.527921Z'], type: 'time', config: timeConfig },
          {
            name: 'Earliest start date',
            values: ['2018-05-19T15:07:42.527921Z'],
            type: 'time',
            config: timeConfig,
          },
          { name: 'Due date', values: ['2018-05-23T15:07:42.527921Z'], type: 'time', config: timeConfig },
          { name: 'Planned start date', values: ['2018-05-20T15:07:42.527921Z'], type: 'time', config: timeConfig },
          { name: 'Planned end date', values: ['2018-05-22T15:07:42.527921Z'], type: 'time', config: timeConfig },
        ]);
      });

      it('should format estimated and planned duration properties', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            {
              timeline: { estimatedDurationInSeconds: 90061 },
              schedule: { plannedDurationInSeconds: 3661 },
            },
          ],
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.ESTIMATED_DURATION,
            WorkItemPropertiesOptions.PLANNED_DURATION,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          {
            name: 'Estimated duration',
            values: ['1 day, 1 hr, 1 min, 1 sec'],
            type: 'string',
          },
          {
            name: 'Planned duration',
            values: ['1 hr, 1 min, 1 sec'],
            type: 'string',
          },
        ]);
      });

      it('should return null for all time fields with missing data', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [
            WorkItemPropertiesOptions.CREATED_AT,
            WorkItemPropertiesOptions.UPDATED_AT,
            WorkItemPropertiesOptions.EARLIEST_START_DATE,
            WorkItemPropertiesOptions.DUE_DATE,
            WorkItemPropertiesOptions.PLANNED_START_DATE,
            WorkItemPropertiesOptions.PLANNED_END_DATE,
          ],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        const timeConfig = { unit: 'time:YYYY-MM-DD HH:mm:ss' };

        expect(result.fields).toEqual([
          { name: 'Created at', values: [null], type: 'time', config: timeConfig },
          { name: 'Updated at', values: [null], type: 'time', config: timeConfig },
          { name: 'Earliest start date', values: [null], type: 'time', config: timeConfig },
          { name: 'Due date', values: [null], type: 'time', config: timeConfig },
          { name: 'Planned start date', values: [null], type: 'time', config: timeConfig },
          { name: 'Planned end date', values: [null], type: 'time', config: timeConfig },
        ]);
      });

      it('should not include a config on string typed fields', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', name: 'Battery Cycle Test' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item ID', values: ['1'], type: 'string' },
          { name: 'Work item name', values: ['Battery Cycle Test'], type: 'string' },
        ]);
        result.fields.forEach(field => expect(field).not.toHaveProperty('config'));
      });

      it('should format known type and state values into readable labels', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [
            { id: '1', type: 'testplan', state: 'IN_PROGRESS' },
            { id: '2', type: 'transportorder', state: 'PENDING_APPROVAL' },
          ],
          continuationToken: '',
          totalCount: 2,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TYPE, WorkItemPropertiesOptions.STATE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item type', values: ['Test plan', 'Transport order'], type: 'string' },
          { name: 'State', values: ['In progress', 'Pending approval'], type: 'string' },
        ]);
      });

      it('should fall back to the raw value for unknown type and state values', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', type: 'customtype', state: 'UNKNOWN_STATE' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.TYPE, WorkItemPropertiesOptions.STATE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Work item type', values: ['customtype'], type: 'string' },
          { name: 'State', values: ['UNKNOWN_STATE'], type: 'string' },
        ]);
      });

      it('should return an empty fields array without querying when no properties are selected', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = { refId: 'A', outputType: OutputType.Properties, types: [WorkItemTypeOptions.WorkOrders] };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
        expect(postSpy).not.toHaveBeenCalled();
      });

      it('should return an empty fields array without querying when properties is an empty array', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [],
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
        expect(postSpy).not.toHaveBeenCalled();
      });

      it('should request the deduplicated projection for every selected property', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: Object.values(WorkItemPropertiesOptions),
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({
            projection: [
              'ID',
              'NAME',
              'TYPE',
              'STATE',
              'SUBSTATE',
              'DESCRIPTION',
              'TEST_PROGRAM',
              'PART_NUMBER',
              'WORKSPACE',
              'ASSIGNED_TO',
              'REQUESTED_BY',
              'CREATED_BY',
              'UPDATED_BY',
              'CREATED_AT',
              'UPDATED_AT',
              'PARENT_ID',
              'TEMPLATE_ID',
              'TIMELINE_EARLIEST_START_DATE_TIME',
              'TIMELINE_DUE_DATE_TIME',
              'TIMELINE_ESTIMATED_DURATION_IN_SECONDS',
              'SCHEDULE_PLANNED_START_DATE_TIME',
              'SCHEDULE_PLANNED_END_DATE_TIME',
              'SCHEDULE_PLANNED_DURATION_IN_SECONDS',
              'RESOURCES_ASSETS_SELECTIONS_ID',
              'RESOURCES_DUTS_SELECTIONS_ID',
              'RESOURCES_FIXTURES_SELECTIONS_ID',
              'RESOURCES_ASSETS_SELECTIONS_TARGET_SYSTEM_ID',
              'RESOURCES_DUTS_SELECTIONS_TARGET_SYSTEM_ID',
              'RESOURCES_FIXTURES_SELECTIONS_TARGET_SYSTEM_ID',
              'RESOURCES_ASSETS_SELECTIONS_TARGET_PARENT_ID',
              'RESOURCES_DUTS_SELECTIONS_TARGET_PARENT_ID',
              'RESOURCES_FIXTURES_SELECTIONS_TARGET_PARENT_ID',
              'RESOURCES_SYSTEMS_SELECTIONS_ID',
              'PROPERTIES',
            ],
          }),
          { showErrorAlert: false }
        );
      });

      it('should query work items in batches according to the take value', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({ workItems: [], totalCount: 0 });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ID],
          take: 5000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(queryInBatches).toHaveBeenCalledWith(
          expect.any(Function),
          { maxTakePerRequest: 1000, requestsPerSecond: 5 },
          5000
        );
      });

      it.each([0, -1])(
        'should return an empty data frame without querying when take is %d',
        async take => {
          const postSpy = jest.spyOn(datasource, 'post');
          const query = {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [WorkItemPropertiesOptions.ID, WorkItemPropertiesOptions.NAME],
            take,
          };

          const result = await datasource.runQuery(query, {} as DataQueryRequest);

          expect(postSpy).not.toHaveBeenCalled();
          expect(result).toEqual({ refId: 'A', name: 'A', fields: [] });
        }
      );
    });

    describe('total count output type', () => {
      it('should return the total count when outputType is TotalCount', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({ totalCount: 42 });

        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
        };
        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result).toEqual({
          refId: 'A',
          name: 'A',
          fields: [{ name: 'A', values: [42] }],
        });
      });

      it('should return 0 as total count when the API returns no totalCount', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({});
        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'A', values: [0] }]);
      });
    });

    describe('workspace and user lookup properties', () => {
      const mockWorkspace = { id: 'ws-1', name: 'Production', default: false, enabled: true };
      const mockUser = {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        properties: {},
        keywords: [],
        created: '',
        updated: '',
        orgId: '',
      };

      beforeEach(() => {
        jest.spyOn(datasource.workspaceUtils, 'getWorkspaces').mockResolvedValue(new Map([['ws-1', mockWorkspace]]));
        jest.spyOn(datasource.usersUtils, 'getUsers').mockResolvedValue(new Map([['user-1', mockUser]]));
      });

      it('should not load lookup data when no lookup property is selected', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', name: 'Battery Cycle Test' }],
          continuationToken: '',
          totalCount: 1,
        });
        const getWorkspacesSpy = jest.spyOn(datasource.workspaceUtils, 'getWorkspaces');
        const getUsersSpy = jest.spyOn(datasource.usersUtils, 'getUsers');
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.NAME],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(getWorkspacesSpy).not.toHaveBeenCalled();
        expect(getUsersSpy).not.toHaveBeenCalled();
      });

      it('should resolve the workspace name for the WORKSPACE property', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', workspace: 'ws-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.WORKSPACE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Workspace', values: ['Production'], type: 'string' }]);
      });

      it('should fall back to the raw workspace ID when the workspace is not found', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', workspace: 'unknown-ws' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.WORKSPACE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Workspace', values: ['unknown-ws'], type: 'string' }]);
      });

      it('should fall back to the raw workspace ID when the workspace lookup fails', async () => {
        jest.spyOn(datasource.workspaceUtils, 'getWorkspaces').mockRejectedValue(new Error('Failed'));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', workspace: 'ws-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.WORKSPACE],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Workspace', values: ['ws-1'], type: 'string' }]);
      });

      it.each([
        [WorkItemPropertiesOptions.ASSIGNED_TO, 'assignedTo', 'Assigned to'],
        [WorkItemPropertiesOptions.REQUESTED_BY, 'requestedBy', 'Requested by'],
        [WorkItemPropertiesOptions.CREATED_BY, 'createdBy', 'Created by'],
        [WorkItemPropertiesOptions.UPDATED_BY, 'updatedBy', 'Updated by'],
      ])('should resolve the user full name for the %s property', async (property, field, label) => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', [field]: 'user-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [property],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: label, values: ['Jane Doe'], type: 'string' }]);
      });

      it('should fall back to the raw user ID when the user is not found', async () => {
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', assignedTo: 'unknown-user' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ASSIGNED_TO],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Assigned to', values: ['unknown-user'], type: 'string' }]);
      });

      it('should fall back to the raw user ID when the users lookup fails', async () => {
        jest.spyOn(datasource.usersUtils, 'getUsers').mockRejectedValue(new Error('Failed'));
        jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1', assignedTo: 'user-1' }],
          continuationToken: '',
          totalCount: 1,
        });

        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.ASSIGNED_TO],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Assigned to', values: ['user-1'], type: 'string' }]);
      });
    });

    describe('parent work item name property', () => {
      it('should resolve the parent work item name via a lookup query', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            return { workItems: [{ id: '1000', name: 'Parent Work Item' }], continuationToken: '', totalCount: 1 };
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([
          { name: 'Parent work item name', values: ['Parent Work Item'], type: 'string' },
        ]);
        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: 'id = "1000"', projection: ['ID', 'NAME'], take: 1 }),
          { showErrorAlert: false }
        );
        expect(queryInBatches).toHaveBeenCalledWith(
          expect.any(Function),
          { maxTakePerRequest: 1000, requestsPerSecond: 5 },
          1
        );
      });

      it('should fall back to the parent ID when the parent work item lookup fails', async () => {
        jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            throw new Error('Request failed');
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });

        const result = await datasource.runQuery(
          {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
            take: 1000,
          },
          {} as DataQueryRequest
        );

        expect(result.fields).toEqual([
          { name: 'Parent work item name', values: ['1000'], type: 'string' },
        ]);
      });

      it('should deduplicate parent IDs before querying for their names', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter?.startsWith('id = ')) {
            return { workItems: [{ id: '1000', name: 'Parent Work Item' }], continuationToken: '', totalCount: 1 };
          }
          return {
            workItems: [
              { id: '1', parentId: '1000' },
              { id: '2', parentId: '1000' },
            ],
            continuationToken: '',
            totalCount: 2,
          };
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        await datasource.runQuery(query, {} as DataQueryRequest);

        expect(postSpy).toHaveBeenCalledWith(
          '/niworkitem/v1/query-workitems',
          expect.objectContaining({ filter: 'id = "1000"', take: 1 }),
          { showErrorAlert: false }
        );
      });

      it('should fall back to the raw parent ID when the parent work item is not found', async () => {
        jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            return { workItems: [], continuationToken: '', totalCount: 0 };
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Parent work item name', values: ['1000'], type: 'string' }]);
      });

      it('should fall back to the parent ID when the parent work item has no name', async () => {
        jest.spyOn(datasource, 'post').mockImplementation(async (_url, body: any) => {
          if (body.filter === 'id = "1000"') {
            return { workItems: [{ id: '1000' }], continuationToken: '', totalCount: 1 };
          }
          return { workItems: [{ id: '1', parentId: '1000' }], continuationToken: '', totalCount: 1 };
        });

        const result = await datasource.runQuery(
          {
            refId: 'A',
            outputType: OutputType.Properties,
            types: [WorkItemTypeOptions.WorkOrders],
            properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
            take: 1000,
          },
          {} as DataQueryRequest
        );

        expect(result.fields).toEqual([
          { name: 'Parent work item name', values: ['1000'], type: 'string' },
        ]);
      });

      it('should return an empty value and skip the lookup when the work item has no parent', async () => {
        const postSpy = jest.spyOn(datasource, 'post').mockResolvedValue({
          workItems: [{ id: '1' }],
          continuationToken: '',
          totalCount: 1,
        });
        const query = {
          refId: 'A',
          outputType: OutputType.Properties,
          types: [WorkItemTypeOptions.WorkOrders],
          properties: [WorkItemPropertiesOptions.PARENT_WORK_ITEM_NAME],
          take: 1000,
        };

        const result = await datasource.runQuery(query, {} as DataQueryRequest);

        expect(result.fields).toEqual([{ name: 'Parent work item name', values: [''], type: 'string' }]);
        expect(postSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('error handling', () => {
      const errorCases = [
        {
          description: 'an unknown status code',
          rejectedError: 'Request failed',
          expectedMessage: 'The query failed due to an unknown error.',
        },
        {
          description: 'status code 404',
          rejectedError: 'Request failed with status code: 404',
          expectedMessage:
            'The query to fetch work items failed because the requested resource was not found. Please check the query parameters and try again.',
        },
        {
          description: 'status code 429',
          rejectedError: 'Request failed with status code: 429',
          expectedMessage: 'The query to fetch work items failed due to too many requests. Please try again later.',
        },
        {
          description: 'status code 504',
          rejectedError: 'Request failed with status code: 504',
          expectedMessage:
            'The query to fetch work items experienced a timeout error. Narrow your query with a more specific filter and try again.',
        },
        {
          description: 'an unhandled status code',
          rejectedError: 'Request failed with status code: 500 Error message: Internal error',
          expectedMessage: 'The query failed due to the following error: (status 500) Internal error.',
        },
      ];

      it.each(errorCases)(
        'should display an error message when the request fails with $description',
        async ({ rejectedError, expectedMessage }) => {
          jest.spyOn(datasource, 'post').mockRejectedValue(new Error(rejectedError));

          const query = {
            refId: 'A',
            outputType: OutputType.TotalCount,
            types: [WorkItemTypeOptions.WorkOrders],
          };

          await expect(datasource.runQuery(query, {} as DataQueryRequest)).rejects.toThrow(expectedMessage);
        }
      );

      it('should publish an alertError event when the request fails', async () => {
        const publishMock = jest.fn();
        (datasource as any).appEvents = { publish: publishMock };
        jest.spyOn(datasource, 'post').mockRejectedValue(new Error('Request failed with status code: 404'));

        const query = {
          refId: 'A',
          outputType: OutputType.TotalCount,
          types: [WorkItemTypeOptions.WorkOrders],
        };

        await expect(datasource.runQuery(query, {} as DataQueryRequest)).rejects.toThrow();
        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: [
            'Error during work items query',
            'The query to fetch work items failed because the requested resource was not found. Please check the query parameters and try again.',
          ],
        });
      });
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

