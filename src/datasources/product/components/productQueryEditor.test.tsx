import { setupRenderer } from "test/fixtures";
import { ProductDataSource } from "../ProductDataSource";
import { ProductQueryEditor } from "./ProductQueryEditor";
import { screen, waitFor } from "@testing-library/react";
import { ProductQuery } from "../types";
import { select } from "react-select-event";
import userEvent from "@testing-library/user-event";

const render = setupRenderer(ProductQueryEditor, ProductDataSource);
let onChange: jest.Mock<any, any>
let properties: HTMLElement
let orderBy: HTMLElement
let descending: HTMLElement
let recordCount: HTMLElement

describe('ProductQueryEditor', () => {
    beforeEach(async() => {
        [onChange] = render({ refId: '', properties: [], orderBy: undefined} as ProductQuery);
        await waitFor(() => properties = screen.getAllByRole('combobox')[0]);
        orderBy = screen.getAllByRole('combobox')[1];
        descending = screen.getByRole('checkbox');
        recordCount = screen.getByRole('textbox');
    });

    it('renders with query default ', async () => {
        expect(properties).toBeInTheDocument();
        expect(properties).not.toBeNull();

        expect(orderBy).toBeInTheDocument();
        expect(orderBy).toHaveAccessibleDescription('Select field to order by');

        expect(descending).toBeInTheDocument();
        expect(descending).not.toBeChecked();

        expect(recordCount).toBeInTheDocument();
        expect(recordCount).toHaveValue('1000');
    });

    it('updates when user makes changes', async () => {    
        //User changes properties       
        await select(properties, "id", { container: document.body });
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ properties: ["id"] })
            )
        });
        
        //User changes order by
        await select(orderBy, "ID", { container: document.body });
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: "ID" })
            )
        });
    
        //User changes descending checkbox
        await userEvent.click(descending);
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ descending: true })
            )
        });
        
        //User changes record count
        await userEvent.clear(recordCount);
        await userEvent.type(recordCount, '500{Enter}');
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ recordCount: 500 })
            )
        });
    });
});