import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { SystemMetadata } from '../../../../system/types';
import { AssetDataSource } from '../../../AssetDataSource';
import { AssetQueryEditor } from '../../AssetQueryEditor';
import { setupRenderer } from '../../../../../test/fixtures';
import { select } from 'react-select-event';
import { ListAssetsDataSource } from './ListAssetsDataSource';
import { ListAssetsQuery } from '../../../types/ListAssets.types';

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

const render = setupRenderer(AssetQueryEditor, FakeAssetDataSource);
const workspacesLoaded = () => waitForElementToBeRemoved(screen.getByTestId('Spinner'));

it('renders with metadata query defaults', async () => {
  render({} as ListAssetsQuery);
  await workspacesLoaded();

  expect(screen.getAllByRole('combobox')[1]).toHaveAccessibleDescription('Any workspace');
  expect(screen.getAllByRole('combobox')[2]).toHaveAccessibleDescription('Select systems');
});

it('renders with initial query and updates when user makes changes', async () => {
  const [onChange] = render({
    minionIds: ['1'],
    workspace: '2',
  } as ListAssetsQuery);
  await workspacesLoaded();

  // Renders saved query
  expect(screen.getByText('Other workspace')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();

  // User selects different workspace
  await select(screen.getAllByRole('combobox')[1], 'Default workspace', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ workspace: '1' }));
  });

  // After selecting different workspace minionIds must be empty
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: [] }));
  });

  // User selects system
  await select(screen.getAllByRole('combobox')[2], '2', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: ['2'] }));
  });

  // User adds another system
  await select(screen.getAllByRole('combobox')[2], '$test_var', { container: document.body });
  await waitFor(() => {
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minionIds: ['2', '$test_var'] }));
  });
});
