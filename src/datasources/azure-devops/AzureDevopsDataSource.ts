import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AzureDevopsQuery } from './types';

export class AzureDevopsDataSource extends DataSourceBase<AzureDevopsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings);
  }

  projectsUrl = this.instanceSettings.url + '/_apis/projects';
  repositoriesUrl = this.instanceSettings.url + '/DevCentral/_apis/git/repositories';
  pullRequestsUrl = this.instanceSettings.url + '/DevCentral/_apis/git/pullrequests';

  defaultQuery = {
    type: 'Git stats',
  };

  async runQuery(query: AzureDevopsQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.type === 'Git stats') {
      const repositories = await this.backendSrv.get(this.repositoriesUrl);
      const activePullRequests = await this.backendSrv.get(this.pullRequestsUrl, {
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
      throw Error('Not implemented');
    }

  }

  async testDatasource(): Promise<TestingStatus> {
    await this.backendSrv.get(this.projectsUrl, { $top: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
