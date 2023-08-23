import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AzureDevopsQuery } from './types';
import _ from 'lodash';

export class AzureDevopsDataSource extends DataSourceBase<AzureDevopsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings);
  }

  projectsUrl = this.instanceSettings.url + '/_apis/projects';
  repositoriesUrl = (project: string) => this.instanceSettings.url + `/${project}/_apis/git/repositories`;
  pullRequestsUrl = (project: string) => this.instanceSettings.url + `/${project}/_apis/git/pullrequests`;
  buildMetricsUrl = (project: string) => this.instanceSettings.url + `/${project}/_apis/build/metrics`;

  defaultQuery = {
    type: 'Git stats',
    project: 'DevCentral'
  };

  async runQuery(query: AzureDevopsQuery, { range, intervalMs }: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.type === 'Git stats') {
      const repositories = await this.backendSrv.get(this.repositoriesUrl(query.project));
      const activePullRequests = await this.backendSrv.get(this.pullRequestsUrl(query.project), {
        'searchCriteria.status': 'active',
        'searchCriteria.targetRefName': 'refs/heads/master',
        $top: 1000,
      });

      return {
        fields: [
          { name: 'Repositories', values: [repositories.count] },
          { name: 'Open Pull Requests', values: [activePullRequests.count] },
        ],
      };
    } else {
      const interval = intervalMs > 120000 ? '/daily' : '/hourly'
      const { value: metrics } = await this.backendSrv.get(this.buildMetricsUrl(query.project) + interval, {
        minMetricsTime: range.from.toISOString(),
      });

      return {
        fields: [
          { name: 'time', values: _(metrics).map('date').compact().uniq().value() },
          { name: 'Successful builds', values: this.getBuildValues(metrics, 'SuccessfulBuilds') },
          { name: 'Failed builds', values: this.getBuildValues(metrics, 'FailedBuilds') },
          { name: 'Canceled builds', values: this.getBuildValues(metrics, 'CanceledBuilds') },
        ],
      };
    }
  }

  getBuildValues(metrics: any[], name: string) {
    return metrics.filter(m => m.name === name).map(m => m.intValue);
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.backendSrv.get(this.projectsUrl, { $top: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
