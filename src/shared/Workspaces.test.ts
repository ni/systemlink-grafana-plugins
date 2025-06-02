import { Workspaces } from './workspace.utils';
import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { Workspace } from 'core/types';

describe('Workspaces', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let workspaceUtils: Workspaces;

    const mockWorkspaces: Workspace[] = [
        { id: '1', name: 'Workspace 1', default: true, enabled: true },
        { id: '2', name: 'Workspace 2', default: false, enabled: true }
    ];

    beforeEach(() => {
        instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
        backendSrv = {
            get: jest.fn().mockResolvedValue({ workspaces: mockWorkspaces }),
        } as unknown as BackendSrv;

        workspaceUtils = new Workspaces(instanceSettings, backendSrv);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load workspaces and cache them', async () => {
        const result = workspaceUtils.workspacesCache;

        expect(backendSrv.get).toHaveBeenCalledWith(`${instanceSettings.url}/niauth/v1/auth`);
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockWorkspaces[0]);
        expect(result.get('2')).toEqual(mockWorkspaces[1]);
    });

    it('should return cached workspaces if already loaded', async () => {
        jest.clearAllMocks();

        workspaceUtils.workspacesCache.set('1', mockWorkspaces[0]);
        workspaceUtils.workspacesCache.set('2', mockWorkspaces[1]);

        const result = workspaceUtils.workspacesCache;

        expect(backendSrv.get).not.toHaveBeenCalled();
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockWorkspaces[0]);
        expect(result.get('2')).toEqual(mockWorkspaces[1]);
    });
});
