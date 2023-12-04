import { DataQueryRequest, DataSourceApi, DataSourceInstanceSettings, LoadingState, QueryEditorProps, TypedVariableModel, dateTime } from '@grafana/data';
import { BackendSrv, BackendSrvRequest, FetchResponse, TemplateSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { render } from '@testing-library/react';
import { Weekday, ValidAssetUtilizationQuery, IsPeak, UtilizationCategory, IsNIAsset, Interval, AssetUtilizationQuery, AssetUtilizationHistory, AssetModel, AssetPresenceWithSystemConnectionModel, UtilizationTimeFrequency } from 'datasources/asset-utilization/types';
import { Matcher, MatcherCreator, calledWithFn, mock } from 'jest-mock-extended';
import _ from 'lodash';
import React from 'react';
import { Observable, of, throwError } from 'rxjs';

const mockVariables: TypedVariableModel[] = [{
  type: 'textbox',
  name: 'test_var',
  current: { text: '123', value: '123', selected: false },
  originalQuery: '',
  options: [],
  query: '',
  id: 'test_var',
  rootStateKey: '',
  global: false,
  hide: 0,
  skipUrlSync: false,
  index: 0,
  state: LoadingState.Done,
  error: null,
  description: null
}]

export function setupDataSource<T>(
  ctor: new (instanceSettings: DataSourceInstanceSettings, backendSrv: BackendSrv, templateSrv: TemplateSrv) => T
) {
  const mockBackendSrv = mock<BackendSrv>(
    {},
    {
      fallbackMockImplementation: (...args) => {
        throw new Error('Unexpected request. Arguments were: \n' + JSON.stringify(args, null, 2));
      },
    }
  );
  const mockTemplateSrv = mock<TemplateSrv>({
    replace: calledWithFn({ fallbackMockImplementation: target => target ?? '' }),
    getVariables: calledWithFn({ fallbackMockImplementation: () => mockVariables })
  });
  const ds = new ctor({ url: '' } as DataSourceInstanceSettings, mockBackendSrv, mockTemplateSrv);
  return [ds, mockBackendSrv, mockTemplateSrv] as const;
}

export function setupRenderer<DSType extends DataSourceApi<TQuery>, TQuery extends DataQuery>(
  component: (props: QueryEditorProps<DSType, TQuery>) => React.JSX.Element,
  ds: new (instanceSettings: DataSourceInstanceSettings, backendSrv: BackendSrv) => DSType
) {
  return (initialQuery: Omit<TQuery, 'refId'>) => {
    const onChange = jest.fn<void, [TQuery]>(),
      onRunQuery = jest.fn();

    const [datasource] = setupDataSource(ds);

    const createElement = (query: TQuery) =>
      React.createElement(component, { datasource, query, onRunQuery, onChange });

    const { rerender } = render(createElement({ ...initialQuery, refId: 'A' } as TQuery));

    // Mimicks Grafana's query editor by rerendering when onChange is called
    onChange.mockImplementation(newQuery => rerender(createElement(newQuery)));

    return [onChange, onRunQuery, ds] as const;
  };
}

export function createFetchResponse<T = any>(data: T): Observable<FetchResponse<T>> {
  return of({ data } as FetchResponse);
}

export function createFetchError(status: number) {
  return throwError(() => ({ status, data: 'Error' }));
}

export const requestMatching: MatcherCreator<BackendSrvRequest, Partial<BackendSrvRequest>> = expected =>
  new Matcher(request => _.isMatch(request, expected!), 'requestMatcher()');

export function mockTimers() {
  jest.spyOn(window, 'setTimeout').mockImplementation(fn => {
    fn();
    return setTimeout(() => 1, 0);
  });
}

export const defaultQueryOptions: Omit<DataQueryRequest, 'targets'> = {
  requestId: '',
  interval: '',
  intervalMs: 0,
  range: { from: dateTime().subtract(1, 'h'), to: dateTime(), raw: { from: 'now-6h', to: 'now' } },
  scopedVars: {},
  timezone: 'browser',
  app: 'panel-editor',
  startTime: 0,
  maxDataPoints: 300,
};

export function getQueryBuilder<TQuery extends DataQuery>() {
  return <K extends keyof TQuery>(defaults: Pick<TQuery, K>) => {
    return (...targets: Array<Omit<TQuery, K | 'refId'> & Partial<TQuery>>): DataQueryRequest<TQuery> => ({
      targets: targets.map((t, ix) => ({ ...defaults, ...t, refId: 'ABCDE'[ix] } as TQuery)),
      ...defaultQueryOptions,
    });
  };
}


export const peakDaysMock: Weekday[] = [
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday
]

export const startAMock = new Date('2023-11-20:00:00:00Z')
export const endAMock = new Date('2023-11-20:02:00:00Z')
export const startBMock = new Date('2023-11-20:01:00:00Z')
export const endBMock = new Date('2023-11-20:03:00:00Z')
export const intervalAMock: Array<Interval<Date>> = [
  {
    startTimestamp: startAMock,
    endTimestamp: endAMock
  }
]
export const intervalBMock: Array<Interval<number>> = [
  {
    startTimestamp: startBMock.getTime(),
    endTimestamp: endBMock.getTime()
  }
]

export const AssetUtilizationHistoryMock: AssetUtilizationHistory[] = [
  {
    utilizationIdentifier: 'abc123',
    assetIdentifier: '321cba',
    minionId: '12345',
    category: 'category A',
    taskName: 'task A',
    userName: 'User',
    startTimestamp: '2023-11-20:00:00:00Z',
    endTimestamp: '2023-11-21:00:00:00Z',
    heartbeatTimestamp: '2023-11-22:00:00:00Z'
  },
  {
    utilizationIdentifier: 'abc123',
    assetIdentifier: '321cba',
    minionId: '12345',
    category: 'category A',
    taskName: 'task A',
    userName: 'User',
    startTimestamp: '2023-11-20:00:00:00Z'
  }
]

export const assetModelMock: AssetModel[] = [
  {
    assetType: "DEVICE_UNDER_TEST",
    busType: "USB",
    calibrationStatus: "APPROACHING_RECOMMENDED_DUE_DATE",
    customCalibrationInterval: 123,
    discoveryType: "Automatic",
    externalCalibration: {},
    fileIds: [''],
    firmwareVersion: '123',
    hardwareVersion: '',
    id: '123',
    modelName: '',
    modelNumber: 123,
    serialNumber: '',
    vendorName: '',
    vendorNumber: 123,
    name: '',
    visaResourceName: '',
    temperatureSensors: [],
    supportsSelfCalibration: true,
    supportsExternalCalibration: true,
    selfCalibration: {},
    isNIAsset: true,
    workspace: '',
    supportsSelfTest: true,
    supportsReset: true,
    location: {
      minionId: 'minion1',
      parent: '',
      resourceUri: '',
      slotNumber: 123,
      systemName: 'system1',
      state: { } as AssetPresenceWithSystemConnectionModel
    },
    lastUpdatedTimestamp: '',
    isSystemController: true,
    keywords: '',
    properties: ''
  }
]

// export const dataSourceInstanceSettingsMock: DataSourceInstanceSettings = {
//   uid: '',
//   name: '',
//   type: '',
//   readOnly: true,
//   access: "direct",
//   id: 123,
//   jsonData: {},
//   meta: {
//     baseUrl: 'url',
//     id: '123',
//     info: {
//       author: { name: 'name' }, 
//       description: '', 
//       links: [], 
//       logos: { large: '', small: '' },
//       screenshots: [],
//       updated: '',
//       version: ''
//     },
//     name: '',
//     type: PluginType.datasource,
//     module: '',
//   }
// }