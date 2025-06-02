import { SystemUtils } from './system.utils';
import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { systemAlias } from './types/QuerySystems.types';
import { queryUsingSkip } from 'core/utils';

const systemAliases: systemAlias[] = [
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
        const result = await systemUtils.systemAliasCache;

        expect(result.size).toEqual(systemAliases.length);
        expect(result.get('1')).toEqual(systemAliases[0]);
        expect(result.get('2')).toEqual(systemAliases[1]);
    });

    it('should handle errors when loading system aliases', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('Failed to fetch systems');
        (queryUsingSkip as jest.Mock).mockImplementationOnce(() => {
            return Promise.reject(error);
        });

        const result = await systemUtils.systemAliasCache;

        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith('Error in loading systems:', error);
        expect(result).toEqual(new Map<string, systemAlias>());
    });

    it('should return cached system aliases if already loaded', async () => {
        await systemUtils.systemAliasCache;
        const cachedResult = await systemUtils.systemAliasCache;

        expect(queryUsingSkip).toHaveBeenCalledTimes(1);
        expect(cachedResult.size).toEqual(systemAliases.length);
        expect(cachedResult.get('1')).toEqual(systemAliases[0]);
        expect(cachedResult.get('2')).toEqual(systemAliases[1]);
    });
});