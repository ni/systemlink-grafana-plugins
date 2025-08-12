import { screen, waitFor } from '@testing-library/react';
import { AssetQuery, AssetQueryType, QueryReturnType } from '../../types/types';
import { SystemProperties } from '../../../system/types'
import { AssetVariableQueryEditor } from './AssetVariableQueryEditor';
import { Workspace } from 'core/types';
import { setupRenderer } from 'test/fixtures';
import { ListAssetsDataSource } from '../../data-sources/list-assets/ListAssetsDataSource';
import { AssetDataSource } from 'datasources/asset/AssetDataSource';
import { select } from 'react-select-event';
import { AssetVariableQuery } from 'datasources/asset/types/AssetVariableQuery.types';

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
    querySystems(filter?: string, projection?: string[]): Promise<SystemProperties[]> {
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
    render({  refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetQuery);

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});

it('renders the return type selector', async () => {
    render({  refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetQuery);

    await waitFor(() => expect(screen.getByText('Return Type')).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText(QueryReturnType.AssetIdentification).length).toBe(1));
});

it('should call onChange when return type is changed', async () => {
    const query = { refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetVariableQuery;
    const [mockOnChange] = render(query);

    await waitFor(async () =>{
        const renderType = screen.getAllByRole('combobox')[0];

        expect(screen.getAllByText(QueryReturnType.AssetIdentification).length).toBe(1);
        await select(renderType, QueryReturnType.AssetId, {
            container: document.body
        });
        expect(screen.getAllByText(QueryReturnType.AssetId).length).toBe(1);
    });

    await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
            queryReturnType: QueryReturnType.AssetId
        }));
    });
});