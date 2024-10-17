import { act, render, screen, waitFor } from '@testing-library/react';
import { AssetQuery } from '../../types/types';
import { SystemMetadata } from '../../../system/types'
import { ListAssetsDataSource } from '../editors/list-assets/ListAssetsDataSource';
import { AssetDataSource } from 'datasources/asset/AssetDataSource';
import { AssetVariableQueryEditor } from './AssetVariableQueryEditor';
import { Workspace } from 'core/types';
import React from 'react';
import { setupDataSource } from 'test/fixtures';

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

const renderComponent = (dataSource: AssetDataSource, onChange: () => void, onRunQuery: () => void) => {
    return (query: AssetQuery) => {
        act(() => {
            render(<AssetVariableQueryEditor datasource={dataSource} onChange={onChange} onRunQuery={onRunQuery} query={query} />);
        });
    };
};

const [ds, ,] = setupDataSource(FakeAssetDataSource);

const renderQueryChange = renderComponent(ds, () => { }, () => { });

it('renders the variable query builder', async () => {
    renderQueryChange({ filter: "" } as AssetQuery);

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});