import React from 'react';
import { render } from '@testing-library/react';
import { AlarmsQueryBuilder } from './AlarmsQueryBuilder';

describe('AlarmsQueryBuilder', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<AlarmsQueryBuilder />);
    expect(getByText('Alarms Query Builder (to be implemented)')).toBeInTheDocument();
  });
});
