import { SystemUtils } from './system.utils';
import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { SystemAlias } from './types/QuerySystems.types';
import { queryUsingSkip } from 'core/utils';

const systemAliases: SystemAlias[] = [
    {
        id: '1',
        alias: 'System 1',
    },
    {
        id: '2',
        alias: 'System 2',
    }
];

jest.mock('core/utils', () => ({
    queryUsingSkip: jest.fn(() => {
        return Promise.resolve({ data: systemAliases, totalCount: 2 });
    })
}));

describe('SystemUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let systemUtils: SystemUtils;

    beforeEach(() => {
        instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
        backendSrv = {
            post: jest.fn()
        } as unknown as BackendSrv;

        systemUtils = new SystemUtils(instanceSettings, backendSrv);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load system aliases and cache them', async () => {
        const result = await systemUtils.getSystemAliases();

        expect(result.size).toEqual(systemAliases.length);
        expect(result.get('1')).toEqual(systemAliases[0]);
        expect(result.get('2')).toEqual(systemAliases[1]);
    });

    it('should propagate error when loading system aliases fails', async () => {
        (SystemUtils as any)['_systemAliasCache'] = undefined;
        const error = new Error('Failed to fetch system aliases');
        (queryUsingSkip as jest.Mock).mockImplementationOnce(() => {
            return Promise.reject(error);
        });

        await expect(systemUtils.getSystemAliases()).rejects.toThrow('Failed to fetch system aliases');
    });

    it('should return cached system aliases if already loaded', async () => {
        (SystemUtils as any)['_systemAliasCache'] = undefined;
        await systemUtils.getSystemAliases();
        jest.clearAllMocks();

        const cachedResult = await systemUtils.getSystemAliases();

        expect(queryUsingSkip).not.toHaveBeenCalled();
        expect(cachedResult.size).toEqual(systemAliases.length);
        expect(cachedResult.get('1')).toEqual(systemAliases[0]);
        expect(cachedResult.get('2')).toEqual(systemAliases[1]);
    });
});
