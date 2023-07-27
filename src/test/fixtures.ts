import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, FetchError } from '@grafana/runtime';
import { mock, MockProxy } from 'jest-mock-extended';

export function createDataSource<T>(
  ctor: new (instanceSettings: DataSourceInstanceSettings, backendSrv: BackendSrv) => T
): [T, MockProxy<BackendSrv>] {
  const mockBackendSrv = mock<BackendSrv>(
    {},
    {
      fallbackMockImplementation: () => {
        throw new Error('Unexpected request');
      },
    }
  );
  const ds = new ctor({ url: '' } as DataSourceInstanceSettings, mockBackendSrv);
  return [ds, mockBackendSrv];
}

export function createFetchError(status: number): FetchError {
  return mock<FetchError>({ status });
}
