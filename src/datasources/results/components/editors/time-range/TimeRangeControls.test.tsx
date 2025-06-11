import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeRangeControls } from './TimeRangeControls';
import userEvent from '@testing-library/user-event';
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

  beforeEach(() => {
    render(<TimeRangeControls {...defaultProps} />);
    useTimeRange = screen.getAllByRole('checkbox')[0];
  });

  it('renders the component with default props', () => {
    expect(useTimeRange).toBeInTheDocument();
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
});
