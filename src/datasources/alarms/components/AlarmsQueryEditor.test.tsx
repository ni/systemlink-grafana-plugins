import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';
import { AlarmsQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';

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
  it('should render the placeholder', () => {
    renderElement();

    expect(screen.getByText('Placeholder for Alarm Query Editor')).toBeInTheDocument();
  });
});
