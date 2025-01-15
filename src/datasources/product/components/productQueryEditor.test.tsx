import { setupRenderer } from "test/fixtures";
import { ProductDataSource } from "../ProductDataSource";
import { ProductQueryEditor } from "./ProductQueryEditor";
import { screen, waitFor } from "@testing-library/react";
import { ProductQuery } from "../types";

const render = setupRenderer(ProductQueryEditor, ProductDataSource);

it('renders with query default controls', async () => {
    render({} as ProductQuery);
    
    await waitFor(() => expect(screen.getAllByText('Properties').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Records to Query').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Descending').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('OrderBy').length).toBe(1));
});