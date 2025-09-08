import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';
import { AlarmsQuery, QueryType } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';

jest.mock('./editors/alarms-count/AlarmsCountQueryEditor', () => ({
  AlarmsCountQueryEditor: jest.fn(() => <div data-testid="mock-alarms-count" />),
}));

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {
  prepareQuery: jest.fn((query: AlarmsQuery) => query),
} as unknown as AlarmsDataSource;

const defaultProps: QueryEditorProps<AlarmsDataSource, AlarmsQuery> = {
  query: {
    refId: 'A',
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

function renderElement(query: AlarmsQuery) {
  const reactNode = React.createElement(AlarmsQueryEditor, { ...defaultProps, query});
  return render(reactNode);
}

describe('AlarmsQueryEditor', () => {
  it('should render the AlarmsCountQueryEditor if queryType is AlarmsCount', () => {
    const query = buildQuery({ queryType: QueryType.AlarmsCount });

    renderElement(query);

    expect(screen.getByTestId('mock-alarms-count')).toBeInTheDocument();
  });

  it('should not render the AlarmsCountQueryEditor when queryType is invalid', () => {
    const query = buildQuery({ queryType: undefined });

    renderElement(query);

    expect(screen.queryByTestId('mock-alarms-count')).not.toBeInTheDocument();
  });

  it('should pass handleQueryChange props to AlarmsCountQueryEditor', () => {
    const query = buildQuery({ queryType: QueryType.AlarmsCount });
    
    renderElement(query);

    expect(AlarmsCountQueryEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        handleQueryChange: expect.any(Function),
        query,
      }),
      expect.anything()
    );
  });

  function buildQuery(query: Omit<AlarmsQuery, 'refId'> = {}) {
    return { refId: 'A', ...query };
  }
});
