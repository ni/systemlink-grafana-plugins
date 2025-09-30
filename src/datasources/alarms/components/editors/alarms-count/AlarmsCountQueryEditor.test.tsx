import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlarmsCountQueryEditor } from './AlarmsCountQueryEditor';
import { QueryType } from 'datasources/alarms/types/types';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';
import { AlarmsCountDataSource } from 'datasources/alarms/query-type-handlers/alarms-count/AlarmsCountDataSource';

const mockHandleQueryChange = jest.fn();
const mockGlobalVars = [{ label: '$var1', value: '$value1' }];
const mockDatasource = {
  globalVariableOptions: jest.fn(() => mockGlobalVars),
} as unknown as AlarmsCountDataSource

const defaultProps = {
  query: {
    refId: 'A',
    queryType: QueryType.AlarmsCount
  },
  handleQueryChange: mockHandleQueryChange,
  datasource: mockDatasource
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

  it('should call handleQueryChange when filter changes', () => {
    const container = renderElement();
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'new-query' } };

    queryBuilder?.dispatchEvent(new CustomEvent('change', event));

    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ filter: 'new-query' }));
  });

  it('should not call handleQueryChange when filter changes with same value', () => {
    const container = renderElement({ refId: 'A', queryType: QueryType.AlarmsCount, filter: 'same-query' });
    const queryBuilder = container.getByRole('dialog');
    const event = { detail: { linq: 'same-query' } };
    
    queryBuilder?.dispatchEvent(new CustomEvent('change', event));
    
    expect(queryBuilder).toBeInTheDocument();
    expect(mockHandleQueryChange).not.toHaveBeenCalled();
  });

  it('should call datasource.globalVariableOptions when component renders', () => {
    renderElement();

    expect(mockDatasource.globalVariableOptions).toHaveBeenCalled();
    expect(mockDatasource.globalVariableOptions).toHaveBeenCalledTimes(1);
  });
});
