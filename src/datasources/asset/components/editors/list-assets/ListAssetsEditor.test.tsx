import { screen, waitFor } from '@testing-library/react';
import { SystemMetadata } from '../../../../system/types';
import { AssetDataSource } from '../../../AssetDataSource';
import { AssetQueryEditor } from '../../AssetQueryEditor';
import { setupRenderer } from '../../../../../test/fixtures';
import { ListAssetsQuery } from '../../../types/ListAssets.types';
import { AssetFeatureTogglesDefaults } from 'datasources/asset/types/types';
import { ListAssetsDataSource } from '../../../data-sources/list-assets/ListAssetsDataSource';
import { QueryBuilderType } from 'datasources/asset/constants/constants';

const fakeSystems: SystemMetadata[] = [
  {
    id: '1',
    state: 'CONNECTED',
    workspace: '1',
  },
  {
    id: '2',
    state: 'CONNECTED',
    workspace: '2',
  },
];

let assetDatasourceOptions = {
  featureToggles: { ...AssetFeatureTogglesDefaults }
}

class FakeAssetsSource extends ListAssetsDataSource {
  querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
    return Promise.resolve(fakeSystems);
  }
}

class FakeAssetDataSource extends AssetDataSource {
  getListAssetsSource(): ListAssetsDataSource {
    return new FakeAssetsSource(this.instanceSettings, this.backendSrv, this.templateSrv);
  }
}

const render = setupRenderer(AssetQueryEditor, FakeAssetDataSource, () => assetDatasourceOptions);

beforeEach(() => {
  assetDatasourceOptions = {
    featureToggles: { ...AssetFeatureTogglesDefaults }
  }
})

it('does not render when feature is not enabled', async () => {
  assetDatasourceOptions.featureToggles.assetList = false;
  render({} as ListAssetsQuery);
  await waitFor(() => expect(screen.getAllByRole('combobox').length).toBe(2));
});

it('renders the query builder', async () => {
  assetDatasourceOptions.featureToggles.assetList = true;
  render({queryBuilderType: QueryBuilderType.Simple} as ListAssetsQuery);

  await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});
