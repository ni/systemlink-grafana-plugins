import React from 'react';
import { render, fireEvent, Matcher, SelectorMatcherOptions } from '@testing-library/react';
import { ProductQueryEditor } from './ProductQueryEditor';
import { ProductDataSource } from '../ProductDataSource';
import { OrderBy } from '../types';

describe('ProductQueryEditor', () => {
    const mockDatasource = {
        prepareQuery: jest.fn(query => query),
    } as unknown as ProductDataSource;

    const defaultProps = {
        query: {
            refId: 'A',
            properties: [],
            orderBy: '',
            descending: false,
            recordCount: 10,
        },
        onChange: jest.fn(),
        onRunQuery: jest.fn(),
        datasource: mockDatasource,
    };

    let getByLabelText: (id: Matcher, options?: SelectorMatcherOptions) => HTMLElement;

    beforeEach(() => {
        ({ getByLabelText } = render(<ProductQueryEditor {...defaultProps} />));
    });

    it('should render correctly', () => {
        expect(getByLabelText('Properties')).toBeInTheDocument();
        expect(getByLabelText('OrderBy')).toBeInTheDocument();
        expect(getByLabelText('Descending')).toBeInTheDocument();
        expect(getByLabelText('Records to Query')).toBeInTheDocument();
    });

    it('should call onChange and onRunQuery when properties change', () => {
        const propertiesSelect = getByLabelText('Properties');

        fireEvent.change(propertiesSelect, { target: { value: 'property1' } });

        expect(defaultProps.onChange).toHaveBeenCalled();
        expect(defaultProps.onRunQuery).toHaveBeenCalled();
    });

    it('should call onChange and onRunQuery when orderBy changes', () => {
        const orderBySelect = getByLabelText('OrderBy');

        fireEvent.change(orderBySelect, { target: { value: OrderBy[0] } });

        expect(defaultProps.onChange).toHaveBeenCalled();
        expect(defaultProps.onRunQuery).toHaveBeenCalled();
    });

    it('should call onChange and onRunQuery when descending changes', () => {
        const descendingSwitch = getByLabelText('Descending');

        fireEvent.click(descendingSwitch);

        expect(defaultProps.onChange).toHaveBeenCalled();
        expect(defaultProps.onRunQuery).toHaveBeenCalled();
    });

    it('should call onChange and onRunQuery when record count changes', () => {
        const recordCountInput = getByLabelText('Records to Query');

        fireEvent.change(recordCountInput, { target: { value: '20' } });
        
        expect(defaultProps.onChange).toHaveBeenCalled();
        expect(defaultProps.onRunQuery).toHaveBeenCalled();
    });
});