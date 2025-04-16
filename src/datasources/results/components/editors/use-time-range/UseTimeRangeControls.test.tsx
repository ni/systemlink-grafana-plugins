import React from 'react';
import { render, screen } from '@testing-library/react';
import { UseTimeRangeControls } from './UseTimeRangeControls';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';

describe('UseTimeRangeControls', () => {
  const mockHandleQueryChange = jest.fn();

  const defaultProps = {
    query: {
      useTimeRange: true,
      useTimeRangeFor: undefined,
    },
    handleQueryChange: mockHandleQueryChange,
  };

  let useTimeRange: HTMLElement;
  let useTimeRangeFor: HTMLElement;

  beforeEach(() => {
    render(<UseTimeRangeControls {...defaultProps} />);
    useTimeRange = screen.getAllByRole('checkbox')[0];
    useTimeRangeFor = screen.getAllByRole('combobox')[0];
  });

  it('renders the component with default props', () => {
    expect(useTimeRange).toBeInTheDocument();
    expect(useTimeRangeFor).toBeInTheDocument();
  });

  it('calls handleQueryChange when the Use time range switch is toggled', async () => {
    await userEvent.click(useTimeRange);

    expect(mockHandleQueryChange).toHaveBeenCalledWith({ useTimeRange: false, useTimeRangeFor: undefined }, false);
  });

  it('calls handleQueryChange when a value is selected in the useTimeRangeFor dropdown', async () => {
    await userEvent.click(useTimeRangeFor);
    await select(useTimeRangeFor, 'Updated', { container: document.body });

    expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ useTimeRangeFor: 'Updated' }));
  });
});
