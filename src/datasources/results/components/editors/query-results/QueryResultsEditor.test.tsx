import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { OutputType, QueryType } from '../../../types/types';
import { select } from 'react-select-event';
import userEvent from '@testing-library/user-event';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { QueryResultsEditor } from './QueryResultsEditor';
import React from 'react';
import { Workspace } from 'core/types';
import { recordCountErrorMessages } from 'datasources/results/constants/ResultsQueryEditor.constants';
import { ResultsProperties } from 'datasources/results/types/QueryResults.types';

jest.mock('../../query-builders/query-results/ResultsQueryBuilder', () => ({
  ResultsQueryBuilder: jest.fn(({ filter, partNumbers, workspaces, status, globalVariableOptions, onChange }) => {
    return (
      <div data-testid="results-query-builder">
        <div data-testid="filter">{filter}</div>
        <div data-testid="part-numbers">{JSON.stringify(partNumbers)}</div>
        <div data-testid="workspaces">{JSON.stringify(workspaces)}</div>
        <div data-testid="status">{JSON.stringify(status)}</div>
        <div data-testid="global-vars">{JSON.stringify(globalVariableOptions)}</div>
        <button data-testid="trigger-change" onClick={() => onChange({ detail: { linq: 'workspace = "Workspace1"' } })}>
          Trigger Change
        </button>
      </div>
    );
  }),
}));

jest.mock('../../../types/types', () => ({
  ...jest.requireActual('../../../types/types'),
  TestMeasurementStatus: {
    Passed: 'PASSED',
    Failed: 'FAILED',
  },
}));

const mockWorkspaces: Workspace[] = [
  { id: '1', name: 'Workspace1', default: false, enabled: true },
  { id: '2', name: 'Workspace2', default: false, enabled: true },
];
const mockGlobalVars = [{ label: '$var1', value: '$var1' }];
const mockPartNumbers = ['PN1', 'PN2', 'PN3'];


const mockDatasource = {
  workspacesCache: Promise.resolve(new Map(mockWorkspaces.map(workspace => [workspace.id, workspace]))),
  partNumbersCache: Promise.resolve(mockPartNumbers),
  globalVariableOptions: jest.fn(() => mockGlobalVars),
} as unknown as QueryResultsDataSource;

const defaultQuery = {
  refId: 'A',
  queryType: QueryType.Results,
  outputType: OutputType.Data,
  properties: [ResultsProperties.id],
  recordCount: 1000,
  useTimeRange: true,
  partNumberQuery: ['PartNumber1'],
  queryBy: 'programName = "name1"',
}

const mockHandleQueryChange = jest.fn();
let properties: HTMLElement;
let recordCount: HTMLElement;
let dataOutput: HTMLElement;
let totalCountOutput: HTMLElement;
let useTimeRange: HTMLElement;
let useTimeRangeFor: HTMLElement;
let productName: HTMLElement;

describe('QueryResultsEditor', () => {
  beforeEach(async () => {
    await act(async () => {
      render(
        <QueryResultsEditor
          query={defaultQuery}
          handleQueryChange={mockHandleQueryChange}
          datasource={mockDatasource}
        />
      );
    });
    properties = screen.getAllByRole('combobox')[0];
    dataOutput = screen.getByRole('radio', { name: 'Data' });
    totalCountOutput = screen.getByRole('radio', { name: 'Total Count' });
    recordCount = screen.getByDisplayValue(1000);
    useTimeRange = screen.getAllByRole('checkbox')[0];
    useTimeRangeFor = screen.getAllByRole('combobox')[1];
    productName = screen.getAllByRole('combobox')[2];
  });

  test('should render with default query when default values are provided', async () => {
    expect(properties).toBeInTheDocument();
    expect(properties).toHaveDisplayValue('');
    expect(dataOutput).toBeInTheDocument();
    expect(dataOutput).toBeChecked();
    expect(recordCount).toBeInTheDocument();
    expect(recordCount).toHaveValue(1000);
    expect(useTimeRange).toBeInTheDocument();
    expect(useTimeRange).toBeChecked();
    expect(useTimeRangeFor).toBeInTheDocument();
    expect(screen.getAllByText('Updated').length).toBe(1);
    expect(productName).toBeInTheDocument();
    expect(screen.getAllByText('ProductName1 (PartNumber1)').length).toBe(1);
    expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining(defaultQuery));
  });

  describe('Properties', () => {
    test('should update properties when user adds a property', async () => {
      await select(properties, 'properties', { container: document.body });
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['id', 'properties'] }));
      });
    });
  
    test('should show error when all properties are removed', async () => {
      const removeButton = screen.getAllByLabelText('Remove');
      for (const button of removeButton) {
        await userEvent.click(button);
      }
  
      expect(screen.getByText('You must select at least one property.')).toBeInTheDocument();
    });
  });

  describe('recordCount', () => {
    it('should not show error and call onChange when Take is valid', async () => {
      await userEvent.clear(recordCount);
      await userEvent.type(recordCount, '500');
      await userEvent.click(document.body);

      expect(recordCount).toHaveValue(500);
      expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ recordCount: 500 }));
    });

    it('should show error and not call onChange when Take is greater than Take limit', async () => {
      mockHandleQueryChange.mockClear();

      await userEvent.clear(recordCount);
      await userEvent.type(recordCount, '10001');
      await userEvent.click(document.body);

      expect(mockHandleQueryChange).not.toHaveBeenCalled();
      expect(screen.getByText(recordCountErrorMessages.lessOrEqualToTakeLimit)).toBeInTheDocument();
    });

    it('should show error and not call onChange when Take is not a number', async () => {
      mockHandleQueryChange.mockClear();

      await userEvent.clear(recordCount);
      await userEvent.type(recordCount, 'abc');
      await userEvent.click(document.body);

      expect(mockHandleQueryChange).not.toHaveBeenCalled();
      expect(screen.getByText(recordCountErrorMessages.greaterOrEqualToZero)).toBeInTheDocument();
    });
  });

  test('should call handle query change with total count outputType when user changes the output type to Total Count', async () => {
    await userEvent.click(totalCountOutput);
    await waitFor(() => {
      expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: 'Total Count' }));
    });
  });

  describe('ResultsQueryBuilder', () => {

    [OutputType.Data, OutputType.TotalCount].forEach(outputType => {
      test('should render ResultsQueryBuilder for both Data and TotalCount when component is loaded',async() => {
        cleanup();
        await act(async () => {
          render(
            <QueryResultsEditor
              query={{
                refId: 'A',
                queryType: QueryType.Results,
                outputType: outputType,
              }}
              handleQueryChange={mockHandleQueryChange}
              datasource={mockDatasource}
            />
          );
        });
  
        expect(screen.getByTestId('results-query-builder')).toBeInTheDocument();
      })
    });

    test('should render empty workspaces when cache is empty', async () => {
      cleanup();

      const emptyDatasource = {
        workspacesCache: Promise.resolve(new Map()),
        partNumbersCache: Promise.resolve(mockPartNumbers),
        globalVariableOptions: jest.fn(() => []),
      } as unknown as QueryResultsDataSource;

      await act(async () => {
        render(
          <QueryResultsEditor
            query={{
              refId: 'A',
              queryType: QueryType.Results,
              outputType: OutputType.Data,
            }}
            handleQueryChange={mockHandleQueryChange}
            datasource={emptyDatasource}
          />
        );
      });

      expect(screen.getByTestId('results-query-builder')).toBeInTheDocument();
      expect(screen.getByTestId('workspaces')).toHaveTextContent('[]');
    })

    test('should render empty part numbers when cache is empty', async () => {
      cleanup();

      const emptyDatasource = {
        workspacesCache: Promise.resolve(new Map(mockWorkspaces.map(workspace => [workspace.id, workspace]))),
        partNumbersCache: Promise.resolve([]),
        globalVariableOptions: jest.fn(() => mockGlobalVars),
      } as unknown as QueryResultsDataSource;

      await act(async () => {
        render(
          <QueryResultsEditor
            query={{
              refId: 'A',
              queryType: QueryType.Results,
              outputType: OutputType.Data,
            }}
            handleQueryChange={mockHandleQueryChange}
            datasource={emptyDatasource}
          />
        );
      });

      expect(screen.getByTestId('results-query-builder')).toBeInTheDocument();
      expect(screen.getByTestId('part-numbers')).toHaveTextContent('[]');
    });

    test('should render ResultsQueryBuilder with default props when component is loaded', () => {
      const resultsQueryBuilder = screen.getByTestId('results-query-builder');
      expect(resultsQueryBuilder).toBeInTheDocument();
      expect(screen.getByTestId('filter')).toHaveTextContent('programName = "name1"');
      expect(screen.getByTestId('workspaces')).toHaveTextContent(JSON.stringify(mockWorkspaces));
      expect(screen.getByTestId('status')).toHaveTextContent(JSON.stringify(['PASSED', 'FAILED']));
      expect(screen.getByTestId('part-numbers')).toHaveTextContent(JSON.stringify(mockPartNumbers));
      expect(screen.getByTestId('global-vars')).toHaveTextContent(JSON.stringify(mockGlobalVars));
    });

    test('should update queryBy when filter is changed', async () => {
      const triggerChangeButton = screen.getByTestId('trigger-change');
      await userEvent.click(triggerChangeButton);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'workspace = "Workspace1"' }));
      });
    });

    test('should not update queryBy when filter is not changed', async () => {
      const initialQueryBy = defaultQuery.queryBy;
      const triggerChangeButton = screen.getByTestId('trigger-change');

      mockHandleQueryChange.mockClear();
      await userEvent.click(triggerChangeButton);
      
      await waitFor(() => {
        expect(mockHandleQueryChange).not.toHaveBeenCalledWith(expect.objectContaining({ queryBy: initialQueryBy }));
      });
    });
  });
});
