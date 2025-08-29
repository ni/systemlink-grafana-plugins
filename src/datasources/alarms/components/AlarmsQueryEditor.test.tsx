import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';
import * as AlarmsCountModule from './editors/alarms-count/AlarmsCountQueryEditor';
import { AlarmsQuery } from '../types/types';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';

jest.mock('./editors/alarms-count/AlarmsCountQueryEditor', () => ({
  AlarmsCountQueryEditor: jest.fn(() => <div data-testid="mock-alarms-count" />),
}));

const mockOnChange = jest.fn();
const mockOnRunQuery = jest.fn();
const mockDatasource = {} as AlarmsDataSource;

const defaultProps: QueryEditorProps<AlarmsDataSource, AlarmsQuery> = {
  query: {
    refId: 'A',
  },
  onChange: mockOnChange,
  onRunQuery: mockOnRunQuery,
  datasource: mockDatasource,
};

function renderElement(query: AlarmsQuery = { refId: 'A' }) {
  const reactNode = React.createElement(AlarmsQueryEditor, { ...defaultProps, query});
  return render(reactNode);
}

describe('AlarmsQueryEditor', () => {
  it('should render the AlarmsCountQueryEditor', () => {
    renderElement();

    expect(screen.getByTestId('mock-alarms-count')).toBeInTheDocument();
  });
});
