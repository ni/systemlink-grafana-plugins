import { DataQueryRequest, DataSourceApi, DataSourceInstanceSettings, QueryEditorProps, dateTime } from '@grafana/data';
import { DataQuery } from '@grafana/schema';
import { BackendSrv, FetchError } from '@grafana/runtime';
import { mock } from 'jest-mock-extended';
import React from 'react';
import { render } from '@testing-library/react';

export function createDataSource<T>(
  ctor: new (instanceSettings: DataSourceInstanceSettings, backendSrv: BackendSrv) => T
) {
  const mockBackendSrv = mock<BackendSrv>(
    {},
    {
      fallbackMockImplementation: () => {
        throw new Error('Unexpected request');
      },
    }
  );
  const ds = new ctor({ url: '' } as DataSourceInstanceSettings, mockBackendSrv);
  return [ds, mockBackendSrv] as const;
}

export function renderQueryEditor<DSType extends DataSourceApi<TQuery>, TQuery extends DataQuery>(
  component: (props: QueryEditorProps<DSType, TQuery>) => React.JSX.Element,
  initialQuery: Omit<TQuery, 'refId'>
) {
  const onChange = jest.fn(),
    onRunQuery = jest.fn(),
    ds = mock<DSType>();

  render(
    React.createElement(component, {
      datasource: ds,
      query: { ...initialQuery, refId: 'A' } as TQuery,
      onRunQuery,
      onChange,
    })
  );
  return [onChange, onRunQuery, ds] as const;
}

export function createFetchError(status: number): FetchError {
  return mock<FetchError>({ status });
}

export function createQueryRequest<TQuery extends DataQuery>(
  ...targets: Array<Omit<TQuery, 'refId'>>
): DataQueryRequest<TQuery> {
  return {
    targets: targets.map((t, ix) => ({...t, refId: 'ABCDE'[ix]} as TQuery)),
    requestId: '',
    interval: '',
    intervalMs: 0,
    range: { from: dateTime().subtract(1, 'h'), to: dateTime(), raw: { from: 'now-6h', to: 'now' } },
    scopedVars: {},
    timezone: 'browser',
    app: 'panel-editor',
    startTime: 0,
  };
}
