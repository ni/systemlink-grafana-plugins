import type { UrlQueryMap } from '@grafana/data';
import { syncXAxisRangeTargets } from 'datasources/data-frame/constants/v2/route-query-parameters';
import { DataFrameQueryParamsHandler } from 'datasources/data-frame/datasources/v2/DataFrameQueryParamsHandler';
import { locationService } from '@grafana/runtime';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  locationService: {
    getSearchObject: jest.fn(),
    partial: jest.fn(),
  },
}));

describe('DataFrameQueryParamsHandler', () => {
  let mockGetSearchObject: jest.Mock;
  let mockPartial: jest.Mock;

  beforeEach(() => {
    mockGetSearchObject = locationService.getSearchObject as unknown as jest.Mock;
    mockPartial = locationService.partial as unknown as jest.Mock;
  });

  describe('updateSyncXAxisRangeTargetsQueryParam', () => {
    it('should not update query parameters when panelId is undefined', () => {
      mockGetSearchObject.mockReturnValue({});

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(true, undefined);

      expect(mockPartial).not.toHaveBeenCalled();
    });

    it('should not update query parameters when panelId is empty', () => {
      mockGetSearchObject.mockReturnValue({});

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(true, '');

      expect(mockPartial).not.toHaveBeenCalled();
    });

    it('should not update query parameters when filterXRangeOnZoomPan is enabled and panelId is already present in targets', () => {
      const queryParams: UrlQueryMap = { [syncXAxisRangeTargets]: '10,11' } as UrlQueryMap;
      mockGetSearchObject.mockReturnValue(queryParams);

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(true, '10');

      expect(mockPartial).not.toHaveBeenCalled();
    });

    it('should not update query parameters when filterXRangeOnZoomPan is disabled and panelId is not present in targets', () => {
      const queryParams: UrlQueryMap = { [syncXAxisRangeTargets]: '11' } as UrlQueryMap;
      mockGetSearchObject.mockReturnValue(queryParams);

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(false, '10');

      expect(mockPartial).not.toHaveBeenCalled();
    });

    it('should update query parameters when filterXRangeOnZoomPan is enabled and panelId is not already present in targets', () => {
      const queryParams: UrlQueryMap = { [syncXAxisRangeTargets]: '1,2' } as UrlQueryMap;
      mockGetSearchObject.mockReturnValue(queryParams);

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(true, '3');

      expect(mockPartial).toHaveBeenCalledTimes(1);
      expect(mockPartial).toHaveBeenCalledWith({ [syncXAxisRangeTargets]: '1,2,3' }, true);
    });

    it('should update query parameters when filterXRangeOnZoomPan is disabled and panelId is present in targets', () => {
      const queryParams: UrlQueryMap = { [syncXAxisRangeTargets]: '1,2' } as UrlQueryMap;
      mockGetSearchObject.mockReturnValue(queryParams);

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(false, '2');

      expect(mockPartial).toHaveBeenCalledTimes(1);
      expect(mockPartial).toHaveBeenCalledWith({ [syncXAxisRangeTargets]: '1' }, true);
    });

    it('should initialize query parameter when it does not exist and filterXRangeOnZoomPan is enabled', () => {
      const queryParams: UrlQueryMap = {} as UrlQueryMap;
      mockGetSearchObject.mockReturnValue(queryParams);

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(true, '42');

      expect(mockPartial).toHaveBeenCalledTimes(1);
      expect(mockPartial).toHaveBeenCalledWith({ [syncXAxisRangeTargets]: '42' }, true);
    });

    it('should update query parameter to empty when it only contains the panelId and filterXRangeOnZoomPan is disabled', () => {
      const queryParams: UrlQueryMap = { [syncXAxisRangeTargets]: '42' } as UrlQueryMap;
      mockGetSearchObject.mockReturnValue(queryParams);

      DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam(false, '42');
      
      expect(mockPartial).toHaveBeenCalledTimes(1);
      expect(mockPartial).toHaveBeenCalledWith({ [syncXAxisRangeTargets]: '' }, true);
    });
  });

  describe('getSyncXAxisRangeTargets', () => {
    it('should return empty array when targets query param is undefined', () => {
      const targets = DataFrameQueryParamsHandler.getSyncXAxisRangeTargets({} as UrlQueryMap);
      expect(targets).toEqual([]);
    });

    it('should return empty array when targets query param is empty string', () => {
      const targets = DataFrameQueryParamsHandler.getSyncXAxisRangeTargets({ [syncXAxisRangeTargets]: '' } as UrlQueryMap);
      expect(targets).toEqual([]);
    });

    it('should return empty array when targets query param is not a string', () => {
      const targets = DataFrameQueryParamsHandler.getSyncXAxisRangeTargets({ [syncXAxisRangeTargets]: 123 as any } as UrlQueryMap);
      expect(targets).toEqual([]);
    });

    it('should return array from comma-separated targets', () => {
      const targets = DataFrameQueryParamsHandler.getSyncXAxisRangeTargets({ [syncXAxisRangeTargets]: 'x,y,z' } as UrlQueryMap);
      expect(targets).toEqual(['x', 'y', 'z']);
    });

    it('should trim whitespace from targets', () => {
      const targets = DataFrameQueryParamsHandler.getSyncXAxisRangeTargets({ [syncXAxisRangeTargets]: ' a , b , c ' } as UrlQueryMap);
      expect(targets).toEqual(['a', 'b', 'c']);
    });
  });
});
