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

    it('should ignore empty targets after splitting', () => {
      const targets = DataFrameQueryParamsHandler.getSyncXAxisRangeTargets({ [syncXAxisRangeTargets]: 'a,,b, ,c' } as UrlQueryMap);
      expect(targets).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getXColumnRangeFromUrlParams', () => {
    it('should retrieve min and max numeric values from URL params', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '50.5',
        'nisl-voltage-max': '150.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 50.5,
        max: 150.75
      });
    });

    it('should return null when min param is missing', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-max': '150.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when max param is missing', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '50.5'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when both params are undefined', () => {
      mockGetSearchObject.mockReturnValue({});

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should handle column names with hyphens', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-my-column-name-min': '10',
        'nisl-my-column-name-max': '20'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('my-column-name');

      expect(result).toEqual({
        min: 10,
        max: 20
      });
    });

    it('should handle equal min and max values for single-point filtering', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '50.5',
        'nisl-voltage-max': '50.5'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 50.5,
        max: 50.5
      });
    });

    it('should return null when min is greater than max', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '150.75',
        'nisl-voltage-max': '50.5'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should handle high precision values', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '10.123456789012',
        'nisl-voltage-max': '100.987654321098'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 10.123456789012,
        max: 100.987654321098
      });
    });

    it('should return null when min value contains invalid characters', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '50.5abc',
        'nisl-voltage-max': '150.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when max value contains invalid characters', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '50.5',
        'nisl-voltage-max': '<script>alert(1)</script>'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when value is empty string', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '',
        'nisl-voltage-max': '150.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when value is NaN string', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': 'NaN',
        'nisl-voltage-max': '150.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when value is Infinity', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': 'Infinity',
        'nisl-voltage-max': '150.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when value is negative Infinity', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '50.5',
        'nisl-voltage-max': '-Infinity'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should handle negative numbers', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '-50.5',
        'nisl-voltage-max': '150.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: -50.5,
        max: 150.75
      });
    });

    it('should handle negative range', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '-150.75',
        'nisl-voltage-max': '-50.5'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: -150.75,
        max: -50.5
      });
    });

    it('should handle decimal values without leading zero', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '.5',
        'nisl-voltage-max': '.75'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 0.5,
        max: 0.75
      });
    });

    it('should handle integer values', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '100',
        'nisl-voltage-max': '200'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 100,
        max: 200
      });
    });

    it('should handle scientific notation', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '1e5',
        'nisl-voltage-max': '2e5'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 100000,
        max: 200000
      });
    });

    it('should handle zero values', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': '0',
        'nisl-voltage-max': '0'
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 0,
        max: 0
      });
    });

    it('should handle duplicate URL parameters by taking the last value', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': ['10', '50', '100'],
        'nisl-voltage-max': ['20', '60', '200']
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 100,
        max: 200
      });
    });

    it('should be case-sensitive for column names', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-Voltage-min': '100',
        'nisl-Voltage-max': '200'
      });

      const resultLower = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');
      expect(resultLower).toBeNull();

      const resultUpper = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('Voltage');
      expect(resultUpper).toEqual({
        min: 100,
        max: 200
      });
    });

    it('should handle when URL param is a number type', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': 50,
        'nisl-voltage-max': 150
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toEqual({
        min: 50,
        max: 150
      });
    });

    it('should return null when URL params are boolean true', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': true,
        'nisl-voltage-max': true
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when URL params are boolean false', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': false,
        'nisl-voltage-max': false
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when array contains boolean values', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': [true, false, true],
        'nisl-voltage-max': [false, true, false]
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });

    it('should return null when array is empty', () => {
      mockGetSearchObject.mockReturnValue({
        'nisl-voltage-min': [],
        'nisl-voltage-max': []
      });

      const result = DataFrameQueryParamsHandler.getXColumnRangeFromUrlParams('voltage');

      expect(result).toBeNull();
    });
  });
});
