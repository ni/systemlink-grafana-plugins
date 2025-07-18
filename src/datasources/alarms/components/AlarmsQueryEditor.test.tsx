import React from 'react';
import { render } from '@testing-library/react';
import { AlarmsQueryEditor } from './AlarmsQueryEditor';

describe('AlarmsQueryEditor', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<AlarmsQueryEditor />);
    expect(getByText('Alarms Query Editor (to be implemented)')).toBeInTheDocument();
  });
});
