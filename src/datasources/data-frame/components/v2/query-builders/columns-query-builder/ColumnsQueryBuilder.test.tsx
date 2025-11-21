import { render } from "@testing-library/react";
import React from "react";
import { ColumnsQueryBuilder } from './ColumnsQueryBuilder';

const mockOnChange = jest.fn();
describe('ColumnsQueryBuilder', () => {
    const containerClass = 'smart-filter-group-condition-container';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    async function renderElement(filter: string, disabled = false) {
        const reactNode = React.createElement(ColumnsQueryBuilder, { filter, onChange: mockOnChange, disabled });
        const renderResult = render(reactNode);
        return {
            renderResult,
            conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
        };
    }

    describe('useEffects', () => {
        it('should render empty query builder', async () => {
            const { renderResult, conditionsContainer } = await renderElement('');

            expect(conditionsContainer.length).toBe(1);
            expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
        });

        it('should select column name in query builder', async () => {
            const { conditionsContainer } = await renderElement('columnName = "test-column"');

            expect(conditionsContainer?.length).toBe(1);
            expect(conditionsContainer.item(0)?.textContent).toContain("test-column");
        });
    });

    describe('onChange', () => {
        it('should call mockOnChange when SlQueryBuilder onChange is triggered', async () => {
            const { renderResult } = await renderElement('');
            const queryBuilder = renderResult.getByRole('dialog');
            expect(queryBuilder).toBeInTheDocument();

            // Simulate a change event
            const eventDetail = { linq: 'new-query' };
            const customEvent = new CustomEvent('change', { detail: eventDetail });
            queryBuilder?.dispatchEvent(customEvent);

            expect(mockOnChange).toHaveBeenCalledTimes(1);
            expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
                detail: eventDetail
            }));
        });
    });

    describe('disabled prop', () => {
        it('should render with disabled state when disabled prop is true', async () => {
            const { renderResult } = await renderElement('', true);
            const queryBuilder = renderResult.getByRole('dialog');
            
            expect(queryBuilder).toBeInTheDocument();
            expect(queryBuilder).toHaveAttribute('disabled');
        });

        it('should render with enabled state when disabled prop is false', async () => {
            const { renderResult } = await renderElement('columnName = "test"', false);
            const queryBuilder = renderResult.getByRole('dialog');
            
            expect(queryBuilder).not.toHaveAttribute('disabled');
        });
    });
});
