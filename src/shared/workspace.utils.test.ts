import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { Workspace } from 'core/types';
import { WorkspaceUtils } from './workspace.utils';
const get = require('core/utils').get;

const mockWorkspaces: Workspace[] = [
    { id: '1', name: 'Workspace 1', default: true, enabled: true },
    { id: '2', name: 'Workspace 2', default: false, enabled: true }
];
jest.mock('core/utils', () => ({
  get: jest.fn(() => {
    return Promise.resolve({ workspaces: mockWorkspaces });
  }),
}));

describe('WorkspaceUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let workspaceUtils: WorkspaceUtils;

    beforeEach(() => {
        instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
        backendSrv = {
            get: jest.fn().mockResolvedValue({ workspaces: mockWorkspaces }),
        } as unknown as BackendSrv;

        workspaceUtils = new WorkspaceUtils(instanceSettings, backendSrv);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load workspaces and cache them', async () => {
        const result = await workspaceUtils.getWorkspaces();

        expect(get).toHaveBeenCalledWith(backendSrv, `${instanceSettings.url}/niauth/v1/auth`, { showErrorAlert: false });
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockWorkspaces[0]);
        expect(result.get('2')).toEqual(mockWorkspaces[1]);
    });

    it('should return cached workspaces if already loaded', async () => {
        await workspaceUtils.getWorkspaces();
        jest.clearAllMocks();

        const result = await workspaceUtils.getWorkspaces();

        expect(get).not.toHaveBeenCalled();
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockWorkspaces[0]);
        expect(result.get('2')).toEqual(mockWorkspaces[1]);
    });

    it('should propagate error when loading workspaces fails', async () => {
        (WorkspaceUtils as any)._workspacesCache = undefined;
        const error = new Error('Failed to fetch workspaces');
        (get as jest.Mock).mockRejectedValueOnce(error);

        await expect(workspaceUtils.getWorkspaces()).rejects.toThrow('Failed to fetch workspaces');
    });
});
