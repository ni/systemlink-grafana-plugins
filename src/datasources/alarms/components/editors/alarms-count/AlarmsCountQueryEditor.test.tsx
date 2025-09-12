import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AlarmsCountQueryEditor } from './AlarmsCountQueryEditor';
import { QueryType } from 'datasources/alarms/types/types';
import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';
import { AlarmsCountDataSource } from 'datasources/alarms/query-type-handlers/alarms-count/AlarmsCountDataSource';
import userEvent from '@testing-library/user-event';

const mockGlobalVars = [{ label: '$var1', value: '$var1' }];
const mockHandleQueryChange = jest.fn();
const mockDatasource = {
  globalVariableOptions: jest.fn(() => mockGlobalVars),
} as unknown as AlarmsCountDataSource

jest.mock('../../query-builder/AlarmsQueryBuilder', () => ({
  AlarmsQueryBuilder: jest.fn((props) => {
    const { filter, globalVariableOptions, onChange } = props;

    return (
      <div data-testid="mock-alarms-query-builder">
        <div data-testid="alarms-filter">{filter}</div>
        <div data-testid="alarms-global-vars">{JSON.stringify(globalVariableOptions)}</div>
        <button
          data-testid="alarms-trigger-change"
          onClick={() => onChange(new CustomEvent('change', { detail: { linq: 'alarmId = "test-alarm-123"' } }))}
        >
          Trigger Alarms Change
        </button>
      </div>
    );
  })
}));

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

    expect(screen.getByText('Query By')).toBeInTheDocument();
    expect(screen.getByTestId('mock-alarms-query-builder')).toBeInTheDocument();
  });

  it('should pass the correct props to AlarmsQueryBuilder', () => {
    renderElement();

    expect(screen.getByTestId('alarms-filter').textContent).toBe('');
    expect(screen.getByTestId('alarms-global-vars').textContent).toBe(JSON.stringify(mockGlobalVars));
  });

  it('should call handleQueryChange on filter change', () => {
    renderElement();
    
    screen.getByTestId('alarms-trigger-change').click();
    
    expect(mockHandleQueryChange).toHaveBeenCalledWith({
      refId: 'A',
      queryType: QueryType.AlarmsCount,
      queryBy: 'alarmId = "test-alarm-123"',
    });
  });

  test('should not call handleQueryChange when filter is not changed', async () => {
    const initialQueryBy = 'alarmId = "test-alarm-123"';
    renderElement({ refId: 'A', queryType: QueryType.AlarmsCount, queryBy: initialQueryBy });
    const triggerChangeButton = screen.getByTestId('alarms-trigger-change');

    await userEvent.click(triggerChangeButton);

    await waitFor(() => {
      expect(mockHandleQueryChange).not.toHaveBeenCalled();
    });
  });
});
