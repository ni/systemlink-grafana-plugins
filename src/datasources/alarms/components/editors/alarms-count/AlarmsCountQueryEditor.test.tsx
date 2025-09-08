import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlarmsCountQueryEditor } from './AlarmsCountQueryEditor';
import { QueryType } from 'datasources/alarms/types/types';

const mockHandleQueryChange = jest.fn();
const defaultProps = {
  query: {
    refId: 'A',
    queryType: QueryType.AlarmsCount
  },
  handleQueryChange: mockHandleQueryChange
}
function renderElement() {
  const reactNode = React.createElement(AlarmsCountQueryEditor, { ...defaultProps });
  return render(reactNode);
}

describe('AlarmsCountQueryEditor', () => {
  it('should render the placeholder', () => {
    renderElement();

    expect(screen.getByText('Placeholder for Alarms Count Query Editor')).toBeInTheDocument();
  });

  it('should call handleQueryChange on init', () => {
    renderElement();

    expect(mockHandleQueryChange).toHaveBeenCalled();
  })
});
