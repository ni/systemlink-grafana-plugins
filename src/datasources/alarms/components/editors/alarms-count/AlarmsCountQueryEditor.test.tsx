import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlarmsCountQueryEditor } from './AlarmsCountQueryEditor';
import { QueryType } from 'datasources/alarms/types/types';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';

const mockHandleQueryChange = jest.fn();

const defaultProps = {
  query: {
    refId: 'A',
    queryType: QueryType.AlarmsCount
  },
  handleQueryChange: mockHandleQueryChange,
};

function renderElement(query: AlarmsCountQuery = { ...defaultProps.query }) {
  const reactNode = React.createElement(AlarmsCountQueryEditor, { ...defaultProps, query });
  
  return render(reactNode);
}

describe('AlarmsCountQueryEditor', () => {
  it('should render the query builder', () => {
    renderElement();

    expect(screen.getAllByText('Property').length).toBe(1);
    expect(screen.getAllByText('Operator').length).toBe(1);
    expect(screen.getAllByText('Value').length).toBe(1);
  });

  it('should call handleQueryChange when query by changes', () => {
    const container = renderElement();
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'new-query' } };

    queryBuilder?.dispatchEvent(new CustomEvent('change', event));

    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'new-query' }));
  });

  it('should not call handleQueryChange when query by changes with same value', () => {
    const container = renderElement({ refId: 'A', queryType: QueryType.AlarmsCount, queryBy: 'same-query' });
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'same-query' } };
    
    queryBuilder?.dispatchEvent(new CustomEvent('change', event));
    
    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).not.toHaveBeenCalled();
  });
});
