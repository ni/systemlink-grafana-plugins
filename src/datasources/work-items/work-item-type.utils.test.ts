import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { WorkItemTypeUtils } from './work-item-type.utils';
const get = require('core/utils').get;

jest.mock('core/utils', () => ({
  get: jest.fn(() => Promise.resolve({
    workItemTypes: [
      { type: 'workorder', description: 'Work orders' },
      { type: 'testplan', description: 'Test plans' },
      { description: 'Missing type' },
      { type: 'workorder', description: 'Duplicate work orders' },
      { type: 'customtype' },
    ],
  })),
}));

describe('WorkItemTypeUtils', () => {
  let instanceSettings: DataSourceInstanceSettings;
  let backendSrv: BackendSrv;
  let workItemTypeUtils: WorkItemTypeUtils;

  beforeEach(() => {
    (WorkItemTypeUtils as any)._workItemTypesCache = undefined;
    instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
    backendSrv = {} as BackendSrv;
    workItemTypeUtils = new WorkItemTypeUtils(instanceSettings, backendSrv);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load work item types and cache them', async () => {
    const result = await workItemTypeUtils.getWorkItemTypes();

    expect(get).toHaveBeenCalledWith(backendSrv, `${instanceSettings.url}/niworkitem/v1/workitemtypes`, { showErrorAlert: false });
    expect(result).toEqual([
      { label: 'Work orders', value: 'workorder' },
      { label: 'Test plans', value: 'testplan' },
      { label: 'customtype', value: 'customtype' },
    ]);

    jest.clearAllMocks();

    await expect(workItemTypeUtils.getWorkItemTypes()).resolves.toEqual(result);
    expect(get).not.toHaveBeenCalled();
  });

  it('should propagate errors when loading work item types fails', async () => {
    const error = new Error('Failed to fetch work item types');
    (get as jest.Mock).mockRejectedValueOnce(error);

    await expect(workItemTypeUtils.getWorkItemTypes()).rejects.toThrow('Failed to fetch work item types');
  });
});
