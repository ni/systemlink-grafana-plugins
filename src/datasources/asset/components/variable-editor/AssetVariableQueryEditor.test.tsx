import { screen, waitFor } from '@testing-library/react';
import { AssetQuery } from '../../types/types';
import { SystemMetadata } from '../../../system/types'
import { AssetVariableQueryEditor } from './AssetVariableQueryEditor';
import { Workspace } from 'core/types';
import { setupRenderer } from 'test/fixtures';
import { ListAssetsDataSource } from '../../data-sources/list-assets/ListAssetsDataSource';
import { AssetDataSource } from 'datasources/asset/AssetDataSource';

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

const fakeWorkspaces: Workspace[] = [
    {
        id: '1',
        name: 'workspace1',
        default: false,
        enabled: true
    },
    {
        id: '2',
        name: 'workspace2',
        default: false,
        enabled: true
    },
];

class FakeAssetsSource extends ListAssetsDataSource {
    getWorkspaces(): Promise<Workspace[]> {
        return Promise.resolve(fakeWorkspaces);
    }
    querySystems(filter?: string, projection?: string[]): Promise<SystemMetadata[]> {
        return Promise.resolve(fakeSystems);
    }
}

class FakeAssetDataSource extends AssetDataSource {
    getListAssetsSource(): ListAssetsDataSource {
        return new FakeAssetsSource(this.instanceSettings, this.backendSrv, this.templateSrv);
    }
}

const render = setupRenderer(AssetVariableQueryEditor, FakeAssetDataSource, () => {});

it('renders the variable query builder', async () => {
    render({ filter: "" } as AssetQuery);

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});