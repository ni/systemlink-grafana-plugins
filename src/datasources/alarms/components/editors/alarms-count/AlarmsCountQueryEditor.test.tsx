import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlarmsCountQueryEditor } from './AlarmsCountQueryEditor';

function renderElement() {
  const reactNode = React.createElement(AlarmsCountQueryEditor);
  return render(reactNode);
}

describe('AlarmsCountQueryEditor', () => {
  it('should render the placeholder', () => {
    renderElement();

    expect(screen.getByText('Placeholder for Alarms Count Query Editor')).toBeInTheDocument();
  });
});
