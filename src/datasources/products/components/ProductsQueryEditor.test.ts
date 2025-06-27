import { setupRenderer } from "test/fixtures";
import { ProductsDataSource } from "../ProductsDataSource";
import { ProductsQueryEditor } from "./ProductsQueryEditor";
import { screen, waitFor } from "@testing-library/react";
import { ProductQuery } from "../types";
import { select } from "react-select-event";
import userEvent from "@testing-library/user-event";
import { recordCountErrorMessages } from "../constants/ProductsQueryEditor.constants";

const render = setupRenderer(ProductsQueryEditor, ProductsDataSource);
let onChange: jest.Mock<any, any>
let onRunQuery: jest.Mock<any, any>
let properties: HTMLElement
let orderBy: HTMLElement
let descending: HTMLElement
let recordCount: HTMLElement

describe('ProductsQueryEditor', () => {
  beforeEach(async () => {
    [onChange, onRunQuery] = render({ refId: '', properties: [], orderBy: undefined, queryBy: '' } as ProductQuery);
    await waitFor(() => properties = screen.getAllByRole('combobox')[0]);
    orderBy = screen.getAllByRole('combobox')[1];
    descending = screen.getByRole('checkbox');
    recordCount = screen.getByDisplayValue('1000');
  });

  it('should call onChange and onRunQuery on mount with UPDATED_AT as OrderBy', () => {
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: [],
        orderBy: 'UPDATED_AT',
        descending: true,
        recordCount: 1000,
        queryBy: ''
      })
    );
    expect(onRunQuery).toHaveBeenCalled();
  });

  it('should render with default query and call onRunQuery on mount', async () => {
    expect(properties).toBeInTheDocument();
    expect(properties).toHaveDisplayValue('');
    expect(orderBy).toBeInTheDocument();
    expect(orderBy).toHaveAccessibleDescription('Select field to order by');
    expect(descending).toBeInTheDocument();
    expect(descending).toBeChecked();
    expect(recordCount).toBeInTheDocument();
    expect(recordCount).toHaveValue(1000);
  });

  it('renders the query builder', async () => {
    await waitFor(() => expect(screen.getAllByText('Property').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Operator').length).toBe(1));
    await waitFor(() => expect(screen.getAllByText('Value').length).toBe(1));
  });

  it('should not call `onChange` when queryBy filter is not changed', async () => {
    onChange.mockClear();
    onRunQuery.mockClear();

    render({ refId: '', properties: [], orderBy: undefined, queryBy: '' } as ProductQuery);
    expect(onChange).not.toHaveBeenCalled();
    expect(onRunQuery).not.toHaveBeenCalled();
  });

  it('updates when user makes changes', async () => {
    //User adds a properties       
    await select(properties, "Product ID", { container: document.body });
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
  });

  describe('Take field', () => {
    it('should not show error and  call onChange when Take is valid', async () => {
      await userEvent.clear(recordCount);
      await userEvent.type(recordCount, '500');
      await userEvent.click(document.body);

      expect(recordCount).toHaveValue(500); 
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ recordCount: 500 })
      );
    });
  
    it('should show error and not call onChange when Take is greater than Take limit', async () => {
      onChange.mockClear();
  
      await userEvent.clear(recordCount);
      await userEvent.type(recordCount, '10001');
      await userEvent.click(document.body);
  
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText(recordCountErrorMessages.lessOrEqualToTakeLimit)).toBeInTheDocument();
    });
  
    it('should show error and not call onChange when Take is not a number', async () => {
      onChange.mockClear();
  
      await userEvent.clear(recordCount);
      await userEvent.type(recordCount, 'abc');
      await userEvent.click(document.body);
  
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText(recordCountErrorMessages.greaterOrEqualToZero)).toBeInTheDocument();
    });
  });

  it('should show error when all properties are removed', async () => {
    // User adds a property
    await select(properties, "Product ID", { container: document.body });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ properties: ["id"] })
      )
    });
    
    // User removes the property
    const removeButton = screen.getByRole('button', { name: 'Remove' });
    await userEvent.click(removeButton);

    expect(screen.getByText('You must select at least one property.')).toBeInTheDocument();
  })
});
