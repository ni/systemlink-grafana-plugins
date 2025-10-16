import { act, screen, waitFor } from '@testing-library/react';
import { AssetQueryType, AssetQueryReturnType } from '../../types/types';
import { SystemProperties } from '../../../system/types'
import { AssetVariableQueryEditor } from './AssetVariableQueryEditor';
import { Workspace } from 'core/types';
import { setupRenderer } from 'test/fixtures';
import { ListAssetsDataSource } from '../../data-sources/list-assets/ListAssetsDataSource';
import { AssetDataSource } from 'datasources/asset/AssetDataSource';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';
import { AssetVariableQuery } from 'datasources/asset/types/AssetVariableQuery.types';
import { LocationModel } from 'datasources/asset/types/ListLocations.types';

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

const fakeLocations: LocationModel[] = [
    {
        id: 'location-1',
        name: 'Location 1'
    },
    {
        id: 'location-2',
        name: 'Location 2'
    }
]

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
    getLocations(): Promise<LocationModel[]> {
        return Promise.resolve(fakeLocations);
    }
}

class FakeAssetDataSource extends AssetDataSource {
    getListAssetsSource(): ListAssetsDataSource {
        return new FakeAssetsSource(this.instanceSettings, this.backendSrv, this.templateSrv);
    }
}

const render = async (query: AssetVariableQuery) => {
    return await act(async () => setupRenderer(AssetVariableQueryEditor, FakeAssetDataSource, () => { })(query))
}


it('renders the variable query builder', async () => {
    render({ refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetVariableQuery);

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});

it('renders the return type selector', async () => {
    render({ refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetVariableQuery);

    await waitFor(() => expect(screen.getByText('Return Type')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(AssetQueryReturnType.AssetTagPath)).toBeInTheDocument());
});

it('should render take', async () => {
    await render({ type: AssetQueryType.ListAssets } as AssetVariableQuery)
    expect(screen.queryByRole('spinbutton')).toBeInTheDocument();
});

it('only allows numbers input in Take field', async () => {
    await render({ type: AssetQueryType.ListAssets, take: 1000 } as AssetVariableQuery);

    const take = screen.getByRole('spinbutton');

    await userEvent.clear(take);
    await userEvent.type(take, 'aaa');
    await waitFor(() => {
        expect(take).toHaveValue(null);
    });

    await userEvent.clear(take);
    await userEvent.type(take, '5');
    await waitFor(() => {
        expect(take).toHaveValue(5);
    });
})

it('should call onChange with take when user changes take', async () => {
    const [onChange] = await render({ type: AssetQueryType.ListAssets, take: 1000 } as AssetVariableQuery);
    const take = screen.getByRole('spinbutton');

    await userEvent.clear(take);
    await userEvent.type(take, '5');
    await userEvent.tab();
    await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });
})

it('should display error message when user changes take to number greater than max take', async () => {
    const [onChange] = await render({} as AssetVariableQuery);
    const take = screen.getByRole('spinbutton');
    onChange.mockClear();

    await userEvent.clear(take);
    await userEvent.type(take, '10001');
    await userEvent.tab();
    await waitFor(() => {
        expect(screen.getByText('Enter a value less than or equal to 10,000')).toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ take: undefined }));
    });
})

it('should display error message when user changes take to number less than 0', async () => {
    const [onChange] = await render({} as AssetVariableQuery);
    const take = screen.getByRole('spinbutton');
    onChange.mockClear();

    await userEvent.clear(take);
    await userEvent.tab();
    await waitFor(() => {
        expect(screen.getByText('Enter a value greater than or equal to 0')).toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ take: undefined }));
    });
})

it('should not display error message when user changes value to number between 0 and max take', async () => {
    const [onChange] = await render({} as AssetVariableQuery);
    const take = screen.getByRole('spinbutton');
    onChange.mockClear();

    await userEvent.clear(take);
    await userEvent.type(take, '5')
    await userEvent.tab();
    await waitFor(() => {
        expect(screen.queryByText('Enter a value greater than or equal to 0')).not.toBeInTheDocument();
        expect(screen.queryByText('Enter a value less than or equal to 10,000')).not.toBeInTheDocument();
    });
})

it('should call onChange when return type is changed', async () => {
    const [onChange] = await render({ refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetVariableQuery)

    await waitFor(async () => {
        const renderType = screen.getAllByRole('combobox')[0];

        expect(screen.getAllByText(AssetQueryReturnType.AssetTagPath).length).toBe(1);
        await select(renderType, AssetQueryReturnType.AssetId, {
            container: document.body
        });
        expect(screen.getAllByText(AssetQueryReturnType.AssetId).length).toBe(1);
    });

    await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            queryReturnType: AssetQueryReturnType.AssetId
        }));
    });

    onChange.mockClear();
});

it('should display default return type AssetTagPath for new variables', async () => {
    const [onChange] = await render({ refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetVariableQuery)
    await waitFor(() => {
        expect(screen.getByText(AssetQueryReturnType.AssetTagPath)).toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
})

it('should allow changing return type and persist the selection', async () => {
    const [onChange] = await render({
        refId: '',
        type: AssetQueryType.ListAssets,
        filter: "",
        queryReturnType: AssetQueryReturnType.AssetTagPath
    } as AssetVariableQuery);

    expect(screen.getByText(AssetQueryReturnType.AssetTagPath)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    const returnTypeSelect = screen.getAllByRole('combobox')[0];
    await select(returnTypeSelect, AssetQueryReturnType.AssetId, {
        container: document.body
    });

    await waitFor(() => {
        expect(screen.getByText(AssetQueryReturnType.AssetId)).toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
            queryReturnType: AssetQueryReturnType.AssetId
        }));
    });
});

it('should maintain independent return types for different variable instances', async () => {
    const [onChange1] = await render({
        refId: 'A',
        type: AssetQueryType.ListAssets,
        filter: "",
        queryReturnType: AssetQueryReturnType.AssetTagPath
    } as AssetVariableQuery);
    expect(screen.getByText(AssetQueryReturnType.AssetTagPath)).toBeInTheDocument();

    const returnTypeSelect = screen.getAllByRole('combobox')[0];
    await select(returnTypeSelect, AssetQueryReturnType.AssetId, {
        container: document.body
    });

    await waitFor(() => {
        expect(screen.getByText(AssetQueryReturnType.AssetId)).toBeInTheDocument();
        expect(onChange1).toHaveBeenCalledWith(expect.objectContaining({
            queryReturnType: AssetQueryReturnType.AssetId
        }));
    });

    const [onChange2] = await render({
        refId: 'B',
        type: AssetQueryType.ListAssets,
        filter: "",
    } as AssetVariableQuery);
    expect(screen.getByText(AssetQueryReturnType.AssetTagPath)).toBeInTheDocument();
    expect(onChange2).not.toHaveBeenCalled();
});
