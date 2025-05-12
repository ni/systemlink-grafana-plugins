import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';
import { QueryStepsEditor } from './QueryStepsEditor';
import React from 'react';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { select } from 'react-select-event';
import userEvent from '@testing-library/user-event';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import { StepsQueryBuilderWrapper } from '../../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper';

jest.mock('../../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper', () => ({
  StepsQueryBuilderWrapper: jest.fn(({ resultsQuery, stepsQuery, onResultsQueryChange, onStepsQueryChange }) => {
    return (
      <div data-testid="steps-query-builder-container">
        <div data-testid="results-query">{resultsQuery}</div>
        <div data-testid="steps-query">{stepsQuery}</div>
        <button
          data-testid="results-trigger-change"
          onClick={() => onResultsQueryChange('updated-results-query')}
        >
          Trigger Results Change
        </button>
        <button
          data-testid="results-empty-trigger"
          onClick={() => onResultsQueryChange('')}
        >
          Trigger Empty Results
        </button>
        <button
          data-testid="steps-trigger-change"
          onClick={() => onStepsQueryChange('updated-steps-query')}
        >
          Trigger Steps Change
        </button>
      </div>
    );
  }),
}));

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
    showMeasurements: false,
    resultsQuery: 'partNumber = "PN1"',
    stepsQuery: 'stepName = "Step1"',
  };

  const mockHandleQueryChange = jest.fn();

  const mockDatasource = {
    loadWorkspaces: jest.fn(),
    getPartNumbers: jest.fn(),
    workspacesCache: new Map(),
    partNumbersCache: [],
    globalVariableOptions: jest.fn(() => []),
    disableStepsQueryBuilder: false
  } as unknown as QueryStepsDataSource;

  let properties: HTMLElement;
  let orderBy: HTMLElement;
  let descending: HTMLElement;
  let recordCount: HTMLElement;
  let dataOutput: HTMLElement;
  let totalCountOutput: HTMLElement;
  let showMeasurements: HTMLElement;

  beforeEach(() => {
    render(<QueryStepsEditor query={defaultQuery} handleQueryChange={mockHandleQueryChange} datasource={mockDatasource}/>);
    properties = screen.getAllByRole('combobox')[0];
    orderBy = screen.getAllByRole('combobox')[2];
    descending = screen.getAllByRole('checkbox')[2];
    dataOutput = screen.getByRole('radio', { name: 'Data' });
    totalCountOutput = screen.getByRole('radio', { name: 'Total Count' });
    recordCount = screen.getByDisplayValue(1000);
    showMeasurements = screen.getAllByRole('checkbox')[0];
  });

  describe('Data outputType', () => {
    let useTimeRange: HTMLElement;
    let useTimeRangeFor: HTMLElement;

    beforeEach(() => {
      useTimeRange = screen.getAllByRole('checkbox')[1];
      useTimeRangeFor = screen.getAllByRole('combobox')[1];
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
      expect(showMeasurements).toBeInTheDocument();
      expect(showMeasurements).not.toBeChecked();
    });

    test('should display placeholders for properties and orderBy when default values are not provided', async () => {
      render(
      <QueryStepsEditor
        query={{outputType: OutputType.Data } as QuerySteps}
        handleQueryChange={mockHandleQueryChange}
        datasource={mockDatasource}
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

    test('should update showMeasurements when user clicks on the show measurements checkbox', async () => {
      await userEvent.click(showMeasurements);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ showMeasurements: true }));
      });
    })

    test('should call handle query change with total count outputType when user changes the output type to Total Count', async () => {
      await userEvent.click(totalCountOutput);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ outputType: 'Total Count' }));
      });
    });
  });

  describe('Query builder', () => {
    [OutputType.Data, OutputType.TotalCount].forEach(outputType => {
      test('should render StepsQueryBuilderContainer for both Data and TotalCount when component is loaded',async() => {
        cleanup();
        await act(async () => {
          render(
            <QueryStepsEditor
              query={{
                refId: 'A',
                queryType: QueryType.Steps,
                outputType: outputType,
                resultsQuery: 'PartNumber = "partNumber1"'
              }}
              handleQueryChange={mockHandleQueryChange}
              datasource={mockDatasource}
            />
          );
        });

        expect(screen.getByTestId('steps-query-builder-container')).toBeInTheDocument();
      })
    });
    
    test('should render query builder with default values', () => {
      const queryBuilderContainer = screen.getByTestId('steps-query-builder-container');
      expect(queryBuilderContainer).toBeInTheDocument();
      expect(jest.mocked(StepsQueryBuilderWrapper)).toHaveBeenCalledWith(
        expect.objectContaining({
          resultsQuery: defaultQuery.resultsQuery,
          stepsQuery: defaultQuery.stepsQuery,
        }),
        expect.anything()
      );
      expect(screen.getByTestId('results-query')).toHaveTextContent('partNumber = "PN1"');
      expect(screen.getByTestId('steps-query')).toHaveTextContent('stepName = "Step1"');
    });

    test('should update results query when user triggers results query change', async () => {
      const triggerResultsChange = screen.getByTestId('results-trigger-change');
      await userEvent.click(triggerResultsChange);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({ resultsQuery: 'updated-results-query' })
        );
      });
    });

    test('should update steps query when user triggers steps query change', async () => {
      const triggerStepsChange = screen.getByTestId('steps-trigger-change');
      await userEvent.click(triggerStepsChange);
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({ stepsQuery: 'updated-steps-query' })
        );
      });
    });

    test('should handle empty results query and disable steps query builder', async () => {
      const emptyQueryTriggerButton = screen.getByTestId('results-empty-trigger');
      
      await userEvent.click(emptyQueryTriggerButton);
      
      await waitFor(() => {
        expect(mockHandleQueryChange).toHaveBeenCalledWith(
          expect.objectContaining({ resultsQuery: '' }),
          false
        );
      });
      expect(mockDatasource.disableStepsQueryBuilder).toBe(true);
    });
  })
});
