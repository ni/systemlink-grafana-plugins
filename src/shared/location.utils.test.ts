import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { Location } from './types/QueryLocations.types';
import { LocationUtils } from './location.utils';
const get = require('core/utils').get;

const mockLocations: Location[] = [
    { id: '1', name: 'Lab A', pathWithNames: '/Building 1/Floor 2/Lab A' },
    { id: '2', name: 'Lab B', pathWithNames: '/Building 1/Floor 3/Lab B' }
];
jest.mock('core/utils', () => ({
  get: jest.fn(() => {
    return Promise.resolve({ locations: mockLocations });
  }),
}));

describe('LocationUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let locationUtils: LocationUtils;

    beforeEach(() => {
        instanceSettings = { url: 'http://localhost' } as DataSourceInstanceSettings;
        backendSrv = {
            get: jest.fn().mockResolvedValue({ locations: mockLocations }),
        } as unknown as BackendSrv;

        locationUtils = new LocationUtils(instanceSettings, backendSrv);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load locations and cache them', async () => {
        const result = await locationUtils.getLocations();

        expect(get).toHaveBeenCalledWith(backendSrv, `${instanceSettings.url}/nilocation/v1/locations`, { showErrorAlert: false });
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockLocations[0]);
        expect(result.get('2')).toEqual(mockLocations[1]);
    });

    it('should return cached locations if already loaded', async () => {
        await locationUtils.getLocations();
        jest.clearAllMocks();

        const result = await locationUtils.getLocations();

        expect(get).not.toHaveBeenCalled();
        expect(result.size).toBe(2);
        expect(result.get('1')).toEqual(mockLocations[0]);
        expect(result.get('2')).toEqual(mockLocations[1]);
    });

    it('should return an empty map when no locations are returned', async () => {
        (LocationUtils as any)._locationsCache = undefined;
        (get as jest.Mock).mockResolvedValueOnce({ locations: undefined });

        const result = await locationUtils.getLocations();

        expect(result.size).toBe(0);
    });

    it('should propagate error when loading locations fails', async () => {
        (LocationUtils as any)._locationsCache = undefined;
        const error = new Error('Failed to fetch locations');
        (get as jest.Mock).mockRejectedValueOnce(error);

        await expect(locationUtils.getLocations()).rejects.toThrow('Failed to fetch locations');
    });
});
