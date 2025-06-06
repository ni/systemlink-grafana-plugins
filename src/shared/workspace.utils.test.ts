import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { Workspace } from 'core/types';
import { WorkspaceUtils } from './workspace.utils';

describe('WorkspaceUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let workspaceUtils: WorkspaceUtils;

    const mockWorkspaces: Workspace[] = [
        { id: '1', name: 'Workspace 1', default: true, enabled: true },
        { id: '2', name: 'Workspace 2', default: false, enabled: true }
    ];

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

        expect(backendSrv.get).toHaveBeenCalledWith(`${instanceSettings.url}/niauth/v1/auth`);
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockWorkspaces[0]);
        expect(result.get('2')).toEqual(mockWorkspaces[1]);
    });

    it('should return cached workspaces if already loaded', async () => {
        await workspaceUtils.getWorkspaces();
        jest.clearAllMocks();

        const result = await workspaceUtils.getWorkspaces();

        expect(backendSrv.get).not.toHaveBeenCalled();
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockWorkspaces[0]);
        expect(result.get('2')).toEqual(mockWorkspaces[1]);
    });

    it('should handle errors when loading workspaces', async () => {
        (WorkspaceUtils as any)._workspacesCache = undefined;
        const error = new Error('API failed');
        backendSrv.get = jest.fn().mockRejectedValue(error);
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await workspaceUtils.getWorkspaces();

        expect(result.size).toBe(0);
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith('Error in loading workspaces:', error);
    });
});
