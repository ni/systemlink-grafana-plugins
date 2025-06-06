import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { OutputType, QueryType } from '../../../types/types';
import { select } from 'react-select-event';
import userEvent from '@testing-library/user-event';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { QueryResultsEditor } from './QueryResultsEditor';
import React from 'react';
import { Workspace } from 'core/types';

jest.mock('../../query-builders/query-results/ResultsQueryBuilder', () => ({
  ResultsQueryBuilder: jest.fn(({ filter, workspaces, status, globalVariableOptions, onChange }) => {
    return (
      <div data-testid="results-query-builder">
        <div data-testid="filter">{filter}</div>
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
]
const mockGlobalVars = [{ label: '$var1', value: '$var1' }];
const mockProducts = {
  products: [
    {partNumber: 'PartNumber1', name: 'ProductName1'},
    {partNumber: 'PartNumber2', name: 'ProductName2'}
  ]
}

const mockDatasource = {
  workspacesCache: Promise.resolve(new Map(mockWorkspaces.map(workspace => [workspace.id, workspace]))),
  productCache: Promise.resolve(mockProducts),
  globalVariableOptions: jest.fn(() => mockGlobalVars),
} as unknown as QueryResultsDataSource;

const mockHandleQueryChange = jest.fn();
let properties: HTMLElement;
let orderBy: HTMLElement;
let descending: HTMLElement;
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
          query={{
            refId: 'A',
            queryType: QueryType.Results,
            outputType: OutputType.Data,
            properties: [],
            orderBy: 'STARTED_AT',
            descending: true,
            recordCount: 1000,
            useTimeRange: true,
            useTimeRangeFor: 'Updated',
            partNumberQuery: ['PartNumber1'],
            queryBy: 'programName = "name1"',
          }}
          handleQueryChange={mockHandleQueryChange}
          datasource={mockDatasource}
        />
      );
    });
    properties = screen.getAllByRole('combobox')[0];
    orderBy = screen.getAllByRole('combobox')[3];
    descending = screen.getAllByRole('checkbox')[1];
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
    expect(orderBy).toBeInTheDocument();
    expect(screen.getAllByText('Started At').length).toBe(1);
    expect(descending).toBeInTheDocument();
    expect(descending).toBeChecked();
    expect(recordCount).toBeInTheDocument();
    expect(recordCount).toHaveValue(1000);
    expect(useTimeRange).toBeInTheDocument();
    expect(useTimeRange).toBeChecked();
    expect(useTimeRangeFor).toBeInTheDocument();
    expect(screen.getAllByText('Updated').length).toBe(1);
    expect(productName).toBeInTheDocument();
    expect(screen.getAllByText('ProductName1 (PartNumber1)').length).toBe(1);
  });

  test('should update properties when user adds a property', async () => {
    await select(properties, 'properties', { container: document.body });
    await waitFor(() => {
      expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ properties: ['properties'] }));
    });
  });

  test('should update orderBy when user changes the orderBy', async () => {
    await select(orderBy, 'Started At', { container: document.body });
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

  test('should update part number query when user changes a product name', async () => {
    await select(productName, 'ProductName2 (PartNumber2)', { container: document.body });
    await waitFor(() => {
      expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ partNumberQuery: ["PartNumber1", "PartNumber2"] }));
    });
  });

    test('should update part number query when user selects a variable in product name field', async () => {
    await select(productName, '$var1', { container: document.body });
    await waitFor(() => {
      expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ partNumberQuery: ["PartNumber1", "$var1"] }));
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
        productCache: Promise.resolve({ products: [] }),
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

    test('should render ResultsQueryBuilder with default props when component is loaded', () => {
      const resultsQueryBuilder = screen.getByTestId('results-query-builder');
      expect(resultsQueryBuilder).toBeInTheDocument();
      expect(screen.getByTestId('filter')).toHaveTextContent('programName = "name1"');
      expect(screen.getByTestId('workspaces')).toHaveTextContent(JSON.stringify(mockWorkspaces));
      expect(screen.getByTestId('status')).toHaveTextContent(JSON.stringify(['PASSED', 'FAILED']));
      expect(screen.getByTestId('global-vars')).toHaveTextContent(JSON.stringify(mockGlobalVars));
    });

    test('should update queryBy when filter is changed', async () => {
      const triggerChangeButton = screen.getByTestId('trigger-change');
      await userEvent.click(triggerChangeButton);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ queryBy: 'workspace = "Workspace1"' }));
      });
    });
  });
});
