import { DataQueryRequest, DataSourceApi, DataSourceInstanceSettings, LoadingState, QueryEditorProps, TypedVariableModel, dateTime } from '@grafana/data';
import { BackendSrv, BackendSrvRequest, FetchResponse, TemplateSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';
import { render } from '@testing-library/react';
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
  ctor: new (instanceSettings: DataSourceInstanceSettings<any>, backendSrv: BackendSrv, templateSrv: TemplateSrv) => T,
  getDatasourceOptions:  () => any = () => {}
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
  const ds = new ctor({ url: '', jsonData: getDatasourceOptions() } as DataSourceInstanceSettings<any>, mockBackendSrv, mockTemplateSrv);
  return [ds, mockBackendSrv, mockTemplateSrv] as const;
}

export function setupRenderer<DSType extends DataSourceApi<TQuery, any>, TQuery extends DataQuery>(
  component: (props: QueryEditorProps<DSType, TQuery>) => React.JSX.Element,
  ds: new (instanceSettings: DataSourceInstanceSettings<any>, backendSrv: BackendSrv) => DSType,
  getDatasourceOptions: () => any = () => {}
) {
  return (initialQuery: Omit<TQuery, 'refId'>) => {
    const onChange = jest.fn<void, [TQuery]>(),
      onRunQuery = jest.fn();

    const [datasource] = setupDataSource(ds, getDatasourceOptions);

    const createElement = (query: TQuery) =>
      React.createElement(component, { datasource, query, onRunQuery, onChange });

    const { rerender } = render(createElement({ ...initialQuery, refId: 'A' } as TQuery));

    // Mimicks Grafana's query editor by rerendering when onChange is called
    onChange.mockImplementation(newQuery => rerender(createElement(newQuery)));

    return [onChange, onRunQuery, datasource] as const;
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
