import { act, screen, waitFor } from '@testing-library/react';
import { AssetQueryType, QueryReturnType } from '../../types/types';
import { SystemProperties } from '../../../system/types'
import { AssetVariableQueryEditor } from './AssetVariableQueryEditor';
import { Workspace } from 'core/types';
import { setupRenderer } from 'test/fixtures';
import { ListAssetsDataSource } from '../../data-sources/list-assets/ListAssetsDataSource';
import { AssetDataSource } from 'datasources/asset/AssetDataSource';
import userEvent from '@testing-library/user-event';
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

const render = async (query: AssetVariableQuery) => {
    return await act(async () => setupRenderer(AssetVariableQueryEditor, FakeAssetDataSource, () => { })(query))
}


it('renders the variable query builder', async () => {
    render({ refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetVariableQuery);

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
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

it('renders the return type selector', async () => {
    render({  refId: '', type: AssetQueryType.ListAssets, filter: "" } as AssetQuery);

    await waitFor(() => expect(screen.getByText('Return Type')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(QueryReturnType.AssetIdentification)).toBeInTheDocument());
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
