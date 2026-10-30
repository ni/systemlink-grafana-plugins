import { Workspace } from "core/types";
import { ProductsDataSource } from "../ProductsDataSource";
import { ProductVariableQuery, PropertiesOptions } from "../types";
import { setupRenderer } from "test/fixtures";
import { ProductsVariableQueryEditor } from "./ProductsVariableQueryEditor";
import { act, screen, waitFor } from "@testing-library/react";

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

const fakePartNumbers: string[] = ['partNumber1', 'partNumber2'];
const fakeFamilyNames: string[] = ['familyName1', 'familyName2'];

class FakeProductsDataSource extends ProductsDataSource {
    getWorkspaces(): Promise<Workspace[]> {
        return Promise.resolve(fakeWorkspaces);
    }

    queryProductValues(fieldName: string): Promise<string[]> {
        if (fieldName === PropertiesOptions.PART_NUMBER) {
            return Promise.resolve(fakePartNumbers);
        }
        return Promise.resolve(fakeFamilyNames);
    }
}

const render = setupRenderer(ProductsVariableQueryEditor, FakeProductsDataSource, () => { });

const getQueryBuilder = () => waitFor(() => {
    const queryBuilder = document.querySelector('smart-query-builder');
    expect(queryBuilder).not.toBeNull();
    return queryBuilder!;
});

const fireQueryBuilderChange = (queryBuilder: Element, linq: string) => {
    act(() => {
        queryBuilder.dispatchEvent(new CustomEvent('change', { detail: { linq } }));
    });
};

it('renders the variable query builder', async () => {
    render({ refId: '', queryBy: '' } as ProductVariableQuery);

    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
});

it('fetches the product values on mount', async () => {
    const queryProductValuesSpy = jest.spyOn(FakeProductsDataSource.prototype, 'queryProductValues');
    render({ refId: '', queryBy: '' } as ProductVariableQuery);

    expect(queryProductValuesSpy).toHaveBeenCalledTimes(2);
    expect(queryProductValuesSpy).toHaveBeenCalledWith(PropertiesOptions.PART_NUMBER);
    expect(queryProductValuesSpy).toHaveBeenCalledWith(PropertiesOptions.FAMILY);
});

it('should not call onChange when the filter event repeats the same value', async () => {
    const [onChange] = render({ refId: '', queryBy: 'Workspace = "1"' } as ProductVariableQuery);
    const queryBuilder = await getQueryBuilder();
    onChange.mockClear();

    fireQueryBuilderChange(queryBuilder, 'Workspace = "1"');

    expect(onChange).not.toHaveBeenCalled();
});

it('should call onChange only once when the query builder fires duplicate change events for the same new value', async () => {
    const [onChange] = render({ refId: '', queryBy: '' } as ProductVariableQuery);
    const queryBuilder = await getQueryBuilder();
    onChange.mockClear();

    fireQueryBuilderChange(queryBuilder, 'Workspace = "1"');
    fireQueryBuilderChange(queryBuilder, 'Workspace = "1"');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'Workspace = "1"' }));
});

