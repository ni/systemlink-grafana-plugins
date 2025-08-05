import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { SystemProperties } from '../../../../system/types';
import { AssetDataSource } from '../../../AssetDataSource';
import { AssetQueryEditor } from '../../AssetQueryEditor';
import { setupRenderer } from '../../../../../test/fixtures';
import { ListAssetsQuery, OutputType } from '../../../types/ListAssets.types';
import { AssetFeatureTogglesDefaults, AssetQueryType } from 'datasources/asset/types/types';
import { ListAssetsDataSource } from '../../../data-sources/list-assets/ListAssetsDataSource';

const fakeSystems: SystemProperties[] = [
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
  querySystems(filter?: string, projection?: string[]): Promise<SystemProperties[]> {
    return Promise.resolve(fakeSystems);
  }
}

class FakeAssetDataSource extends AssetDataSource {
  getListAssetsSource(): ListAssetsDataSource {
    return new FakeAssetsSource(this.instanceSettings, this.backendSrv, this.templateSrv);
  }
}


const render = async (query: ListAssetsQuery) => {
  return await act(async () => setupRenderer(AssetQueryEditor, FakeAssetDataSource, () => assetDatasourceOptions)(query));
}

beforeEach(() => {
  assetDatasourceOptions = {
    featureToggles: { ...AssetFeatureTogglesDefaults }
  };
})

it('does not render when feature is not enabled', async () => {
  assetDatasourceOptions.featureToggles.assetList = false;
  await render({} as ListAssetsQuery);
  await waitFor(() => expect(screen.getAllByRole('combobox').length).toBe(2));
});

it('renders the query builder', async () => {
  assetDatasourceOptions.featureToggles.assetList = true;
  await render({} as ListAssetsQuery);
  await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
  await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});

it('should render OutputType RadioButtonGroup with correct options', async () => {
  await render({} as ListAssetsQuery)
  expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: OutputType.TotalCount })).toBeInTheDocument();
});

it('should set OutputType to "TotalCount" and trigger rerender', async () => {
  const [onChange] = await render({
    type: AssetQueryType.ListAssets,
    filter: '',
    refId: ''
  });

  expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeChecked();
  expect(screen.getByRole('radio', { name: OutputType.TotalCount })).not.toBeChecked();
  fireEvent.click(screen.getByLabelText('Total Count'));

  await waitFor(() => {
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      refId: 'A',
      type: AssetQueryType.ListAssets,
      outputType: OutputType.TotalCount,
    }))
  })
});

it('should set OutputType to "Properties" and trigger rerender', async () => {
  const [onChange] = await render({
    type: AssetQueryType.ListAssets,
    outputType: OutputType.TotalCount,
    filter: '',
    refId: ''
  });

  expect(screen.getByRole('radio', { name: OutputType.Properties })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: OutputType.TotalCount })).toBeChecked();
  fireEvent.click(screen.getByLabelText('Properties'));

  await waitFor(() => {
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      refId: 'A',
      type: AssetQueryType.ListAssets,
      outputType: OutputType.Properties,
    }))
  })
});

it('should display "Properties" selected when OutpuType is set to properties', async () => {
  await render({ type: AssetQueryType.ListAssets, outputType: OutputType.Properties } as ListAssetsQuery)
  expect(screen.getByRole('radio', { name: OutputType.Properties })).toBeChecked();
  expect(screen.getByRole('radio', { name: OutputType.TotalCount })).not.toBeChecked();
})

it('should display "TotalCount" selected when OutpuType is set to total count', async () => {
  await render({ type: AssetQueryType.ListAssets, outputType: OutputType.TotalCount } as ListAssetsQuery)
  expect(screen.getByRole('radio', { name: OutputType.Properties })).not.toBeChecked();
  expect(screen.getByRole('radio', { name: OutputType.TotalCount })).toBeChecked();
})

