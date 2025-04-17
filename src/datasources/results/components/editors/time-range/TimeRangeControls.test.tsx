import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeRangeControls } from './TimeRangeControls';
import userEvent from '@testing-library/user-event';
import { select } from 'react-select-event';
import { OutputType, QueryType } from 'datasources/results/types/types';

describe('TimeRangeControls', () => {
  const mockHandleQueryChange = jest.fn();

  const defaultProps = {
    query: {
      useTimeRange: true,
      useTimeRangeFor: undefined,
      outputType: OutputType.Data,
      queryType: QueryType.Results,
      refId: 'A',
    },
    handleQueryChange: mockHandleQueryChange,
  };

  let useTimeRange: HTMLElement;
  let useTimeRangeFor: HTMLElement;

  beforeEach(() => {
    render(<TimeRangeControls {...defaultProps} />);
    useTimeRange = screen.getAllByRole('checkbox')[0];
    useTimeRangeFor = screen.getAllByRole('combobox')[0];
  });

  it('renders the component with default props', () => {
    expect(useTimeRange).toBeInTheDocument();
    expect(useTimeRangeFor).toBeInTheDocument();
  });

  it('calls handleQueryChange when the Use time range switch is toggled', async () => {
    await userEvent.click(useTimeRange);

    expect(mockHandleQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        useTimeRange: false,
        useTimeRangeFor: undefined,
      }),
      false
    );
  });

  it('calls handleQueryChange when a value is selected in the useTimeRangeFor dropdown', async () => {
    await userEvent.click(useTimeRangeFor);
    await select(useTimeRangeFor, 'Updated', { container: document.body });

    expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ useTimeRangeFor: 'Updated' }));
  });
});
