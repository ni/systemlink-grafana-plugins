import { render, screen, waitFor } from '@testing-library/react';
import { QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';
import { QueryStepsEditor } from './QueryStepsEditor';
import React from 'react';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { select } from 'react-select-event';
import userEvent from '@testing-library/user-event';

describe('QueryStepsEditor', () => {
  const defaultQuery: QuerySteps = {
    refId: 'A',
    queryType: QueryType.Steps,
    outputType: OutputType.Data,
    properties: [StepsProperties.data],
    orderBy: 'STARTED_AT',
    descending: true,
    useTimeRange: true,
    useTimeRangeFor: 'Updated',
    recordCount: 1000,
  };

  const mockHandleQueryChange = jest.fn();

  let properties: HTMLElement;
  let orderBy: HTMLElement;
  let descending: HTMLElement;
  let recordCount: HTMLElement;
  let dataOutput: HTMLElement;
  let totalCountOutput: HTMLElement;

  beforeEach(() => {
    render(<QueryStepsEditor query={defaultQuery} handleQueryChange={mockHandleQueryChange} />);
    properties = screen.getAllByRole('combobox')[0];
    orderBy = screen.getAllByRole('combobox')[1];
    descending = screen.getAllByRole('checkbox')[0];
    dataOutput = screen.getByRole('radio', { name: 'Data' });
    totalCountOutput = screen.getByRole('radio', { name: 'Total Count' });
    recordCount = screen.getByDisplayValue(1000);
  });

  describe('Data outputType', () => {
    let useTimeRange: HTMLElement;
    let useTimeRangeFor: HTMLElement;

    beforeEach(() => {
      useTimeRange = screen.getAllByRole('checkbox')[1];
      useTimeRangeFor = screen.getAllByRole('combobox')[2];
    });

    test('should render with default query when default values are provided', async () => {
      expect(properties).toBeInTheDocument();
      expect(screen.getAllByText('data').length).toBe(1);
      expect(dataOutput).toBeInTheDocument();
      expect(dataOutput).toBeChecked();
      expect(orderBy).toBeInTheDocument();
      expect(screen.getAllByText('Started at').length).toBe(1);
      expect(descending).toBeInTheDocument();
      expect(descending).toBeChecked();
      expect(recordCount).toBeInTheDocument();
      expect(recordCount).toHaveValue(1000);
      expect(useTimeRange).toBeInTheDocument();
      expect(useTimeRange).toBeChecked();
      expect(useTimeRangeFor).toBeInTheDocument();
      expect(screen.getAllByText('Updated').length).toBe(1);
    });

    test('should display placeholders for properties and orderBy when default values are not provided', async () => {
      render(
      <QueryStepsEditor
        query={{outputType: OutputType.Data } as QuerySteps}
        handleQueryChange={mockHandleQueryChange}
      />
      );

      expect(screen.getByText('Select properties to fetch')).toBeInTheDocument();
      expect(screen.getByText('Select field to order by')).toBeInTheDocument();
    });

    test('should update properties when user adds a property', async () => {
      await select(properties, 'properties', { container: document.body });
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({ properties: ['data', 'properties'] })
        );
      });
    });

    test('should update orderBy when user changes the orderBy', async () => {
      await select(orderBy, 'Started at', { container: document.body });
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'STARTED_AT' }));
      });
    });
    test('should update descending when user clicks on the descending checkbox', async () => {
      await userEvent.click(descending);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ descending: false }));
      });
    });

    describe('recordCount', () => {
      test('should update record count when user enters numeric values in the take', async () => {
        await userEvent.clear(recordCount);
        await userEvent.type(recordCount, '500');
        await waitFor(() => {
          expect(recordCount).toHaveValue(500);
        });
      });

      test('should not update record count when user enters non-numeric values in the take', async () => {
        await userEvent.clear(recordCount);
        await userEvent.type(recordCount, 'Test');
        await waitFor(() => {
          expect(recordCount).toHaveValue(null);
        });
      });
    });

    test('should call handle query change with total count outputType when user changes the output type to Total Count', async () => {
      await userEvent.click(totalCountOutput);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: 'Total Count' }));
      });
    });
  });
});
