import { setupRenderer } from 'test/fixtures';
import { ResultsDataSource } from '../../../ResultsDataSource';
import { screen, waitFor } from '@testing-library/react';
import { ResultsQuery } from '../../../types';
import { select } from 'react-select-event';
import userEvent from '@testing-library/user-event';
import { ResultsQueryEditor } from '../../ResultsQueryEditor';

const render = setupRenderer(ResultsQueryEditor, ResultsDataSource);

let onChange: jest.Mock<any, any>;
let properties: HTMLElement;
let orderBy: HTMLElement;
let descending: HTMLElement;
let recordCount: HTMLElement;
let dataOutput: HTMLElement;
let totalCountOutput: HTMLElement;

describe('QueryResultsEditor', () => {
  beforeEach(() => {
    [onChange] = render({
      refId: '',
      outputType: 'Data',
      properties: [],
      orderBy: undefined,
      descending: false,
      recordCount: 1000,
      useTimeRange: true,
      useTimeRangeFor: undefined,
    } as ResultsQuery);
    properties = screen.getAllByRole('combobox')[0];
    orderBy = screen.getAllByRole('combobox')[1];
    descending = screen.getAllByRole('checkbox')[0];
    dataOutput = screen.getByRole('radio', { name: 'Data' });
    totalCountOutput = screen.getByRole('radio', { name: 'Total Count' });
    recordCount = screen.getByRole('textbox');
  });

  describe('Data outputType', () => {
    let useTimeRange: HTMLElement;
    let useTimeRangeFor: HTMLElement;

    beforeEach(() => {
      useTimeRange = screen.getAllByRole('checkbox')[1];
      useTimeRangeFor = screen.getAllByRole('combobox')[2];
    });

    test('renders with default query', async () => {
      expect(properties).toBeInTheDocument();
      expect(properties).toHaveDisplayValue('');
      expect(dataOutput).toBeInTheDocument();
      expect(dataOutput).toBeChecked();
      expect(orderBy).toBeInTheDocument();
      expect(orderBy).toHaveAccessibleDescription('Select field to order by');
      expect(descending).toBeInTheDocument();
      expect(descending).not.toBeChecked();
      expect(recordCount).toBeInTheDocument();
      expect(recordCount).toHaveValue('1000');
      expect(useTimeRange).toBeInTheDocument();
      expect(useTimeRange).toBeChecked();
      expect(useTimeRangeFor).toBeInTheDocument();
      expect(useTimeRangeFor).toHaveAccessibleDescription('Choose');
    });

    test('updates when user makes changes', async () => {
      //User adds a properties
      await select(properties, 'properties', { container: document.body });
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['properties'] }));
      });

      //User changes order by
      await select(orderBy, 'Started At', { container: document.body });
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ orderBy: 'STARTED_AT' }));
      });

      //User changes descending checkbox
      await userEvent.click(descending);
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ descending: true }));
      });

      //User changes record count
      await userEvent.clear(recordCount);
      await userEvent.type(recordCount, '500{Enter}');
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: 500 }));
      });

      //User changes useTimeRange checkbox
      await userEvent.click(useTimeRange);
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ useTimeRange: false }));
      });

      //User changes useTimeRangeFor
      await userEvent.click(useTimeRange); //To enable useTimeRangeFor
      await select(useTimeRangeFor, 'Updated', { container: document.body });
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ useTimeRangeFor: 'Updated' }));
      });

      //User changes output type to Total Count
      await userEvent.click(totalCountOutput);
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: 'Total Count' }));
      });
    });
  });

  describe('Total Count outputType', () => {
    test('renders correctly when outputType is Total Count', async () => {
      await userEvent.click(totalCountOutput);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: 'Total Count' }));
      });
      expect(properties).not.toBeInTheDocument();
      expect(orderBy).not.toBeInTheDocument();
      expect(descending).not.toBeInTheDocument();
      expect(recordCount).not.toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')[0]).toBeInTheDocument(); //useTimeRange
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument(); //useTimeRangeFor
    });
  });
});
