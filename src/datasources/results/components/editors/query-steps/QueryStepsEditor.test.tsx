import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';
import { QueryStepsEditor } from './QueryStepsEditor';
import React from 'react';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { select } from 'react-select-event';
import userEvent from '@testing-library/user-event';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import { StepsQueryBuilderWrapper } from '../../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper';
import { recordCountErrorMessages } from 'datasources/results/constants/StepsQueryEditor.constants';

jest.mock('../../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper', () => ({
  StepsQueryBuilderWrapper: jest.fn(({ resultsQuery, stepsQuery, onResultsQueryChange, onStepsQueryChange, disableStepsQueryBuilder }) => {
    return (
      <div data-testid="steps-query-builder-container">
        <input 
          data-testid="results-query"
          value={resultsQuery}
          onChange={(e) => onResultsQueryChange(e.target.value)}
        />
        <input 
          data-testid="steps-query"
          value={stepsQuery}
          onChange={(e) => onStepsQueryChange(e.target.value)}
          disabled={disableStepsQueryBuilder} 
        />
      </div>
    );
  }),
}));

const mockProducts = {
  products: [
    {partNumber: 'PartNumber1', name: 'ProductName1'},
    {partNumber: 'PartNumber2', name: 'ProductName2'}
  ]
}

const mockGlobalVars = [
  { label: '$var1', value: '$var1' },
  { label: '$var2', value: '$var2' }
];

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
    partNumberQuery: ['PartNumber1'],
    resultsQuery: 'partNumber = "PN1"',
    stepsQuery: 'stepName = "Step1"',
  };

  const mockHandleQueryChange = jest.fn();

  const mockDatasource = {
    loadWorkspaces: jest.fn(),
    getPartNumbers: jest.fn(),
    productCache: Promise.resolve(mockProducts),
    workspacesCache: new Map(),
    globalVariableOptions: jest.fn(() => mockGlobalVars),
    disableStepsQueryBuilder: false
  } as unknown as QueryStepsDataSource;

  let properties: HTMLElement;
  let orderBy: HTMLElement;
  let descending: HTMLElement;
  let recordCount: HTMLElement;
  let dataOutput: HTMLElement;
  let totalCountOutput: HTMLElement;
  let showMeasurements: HTMLElement;
  let productName: HTMLElement;

  beforeEach(async () => {
    await act(async () => {
      render(<QueryStepsEditor query={defaultQuery} handleQueryChange={mockHandleQueryChange} datasource={mockDatasource}/>);
    });
    properties = screen.getAllByRole('combobox')[0];
    orderBy = screen.getAllByRole('combobox')[3];
    descending = screen.getAllByRole('checkbox')[2];
    dataOutput = screen.getByRole('radio', { name: 'Data' });
    totalCountOutput = screen.getByRole('radio', { name: 'Total Count' });
    recordCount = screen.getByDisplayValue(1000);
    showMeasurements = screen.getAllByRole('checkbox')[0];
    productName = screen.getAllByRole('combobox')[2];
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
      expect(productName).toBeInTheDocument();
      expect(screen.getAllByText('ProductName1 (PartNumber1)').length).toBe(1);
      expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining(defaultQuery));
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

    it('should show error when all properties are removed', async () => {
      // User removes the property
      const removeButton = screen.getAllByRole('button', { name: 'Remove' });
      for (const button of removeButton) {
        await userEvent.click(button);
      }

      expect(screen.getByText('You must select at least one property.')).toBeInTheDocument();
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

    describe('Product Part Number', () => {
      test('should update part number query when user selects a variable in product name dropdown', async () => {
        await select(productName, '$var1', { container: document.body });
        await waitFor(() => {
          expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ partNumberQuery: ['PartNumber1', '$var1'] }));
        });
      });

      test('should update part number query when user selects a product in product name dropdown', async () => {
        await select(productName, 'ProductName2 (PartNumber2)', { container: document.body });	        await select(productName, 'ProductName2 (PartNumber2)', { container: document.body });
        await waitFor(() => {
          expect(mockHandleQueryChange).toHaveBeenCalledWith(expect.objectContaining({ partNumberQuery: ["PartNumber1", "PartNumber2"] }));
        });
      });

      test('should show error when no product is selected', async () => {    
        //Click remove button to remove all the selected product    
        const removeButton = screen.getAllByRole('button', { name: 'Remove' });
        for (const button of removeButton) {
          await userEvent.click(button);
        }

        expect(screen.getByText('You must select at least one product in this field.')).toBeInTheDocument();
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
                partNumberQuery: ['partNumber1'],
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
      expect(screen.getByTestId('results-query')).toHaveValue('partNumber = "PN1"');
      expect(screen.getByTestId('steps-query')).toHaveValue('stepName = "Step1"');
    });

    test('should update results query when user triggers results query change', () => {
      const resultsQueryInput = screen.getByTestId('results-query');

      fireEvent.change(resultsQueryInput, { target: { value: 'updated-results-query' } });

      expect(mockHandleQueryChange).toHaveBeenCalledWith(
        expect.objectContaining({ resultsQuery: 'updated-results-query' })
      );
    });

    test('should not update results query when filter doesnt change', () => {
      const resultsQueryInput = screen.getByTestId('results-query');
      fireEvent.change(resultsQueryInput, { target: { value: 'partNumber = "PN1"' } });// ensure initial value is set
      mockHandleQueryChange.mockClear();

      fireEvent.change(resultsQueryInput, { target: { value: 'partNumber = "PN1"' } });

      expect(mockHandleQueryChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ resultsQuery: 'partNumber = "PN1"' })
      );
    });

    test('should update steps query when user triggers steps query change', () => {
      const stepsQueryInput = screen.getByTestId('steps-query');

      fireEvent.change(stepsQueryInput, { target: { value: 'updated-steps-query' } });

      expect(mockHandleQueryChange).toHaveBeenCalledWith(
        expect.objectContaining({ stepsQuery: 'updated-steps-query' })
      );
    });

    test('should not update steps query when filter doesnt change', () => {
      const stepsQueryInput = screen.getByTestId('steps-query');
      fireEvent.change(stepsQueryInput, { target: { value: 'stepName = "Step1"' } });// ensure initial value is set
      mockHandleQueryChange.mockClear();

      fireEvent.change(stepsQueryInput, { target: { value: 'stepName = "Step1"' } });

      expect(mockHandleQueryChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ stepsQuery: 'stepName = "Step1"' })
      );
    })

    test('should disable steps query builder when partnumber is empty', async () => {
      cleanup();
        await act(async () => {
          render(
            <QueryStepsEditor
              query={{
                refId: 'A',
                queryType: QueryType.Steps,
                outputType: OutputType.Data,
                partNumberQuery: [],
                stepsQuery: 'stepName = "Step1"',
              }}
              handleQueryChange={mockHandleQueryChange}
              datasource={mockDatasource}
            />
          );
        });
        const stepsQueryInput = screen.getByTestId('steps-query');

        expect(stepsQueryInput).toBeDisabled();
    });

    test('should not disable steps query builder when partnumber is not empty', async () => {
      cleanup();
      await act(async () => {
        render(
          <QueryStepsEditor
            query={{
              refId: 'A',
              queryType: QueryType.Steps,
              outputType: OutputType.Data,
              partNumberQuery: ['PartNumber1'],
              stepsQuery: 'stepName = "Step1"',
            }}
            handleQueryChange={mockHandleQueryChange}
            datasource={mockDatasource}
          />
        );
      });
      const stepsQueryInput = screen.getByTestId('steps-query');

      expect(stepsQueryInput).not.toBeDisabled();
    });
  })

  describe('Total Count outputType', () => {
    test('should not render orderBy, descending, take when outputType is Total Count', () => {
      cleanup();
      render(
        <QueryStepsEditor
          query={{ ...defaultQuery, outputType: OutputType.TotalCount }}
          handleQueryChange={mockHandleQueryChange}
          datasource={mockDatasource}
        />
      );

      expect(screen.queryByText('OrderBy')).not.toBeInTheDocument();
      expect(screen.queryByText('Descending')).not.toBeInTheDocument();
      expect(screen.queryByText('Take')).not.toBeInTheDocument();
    });

    test('should render useTimeRange and useTimeRangeFor when outputType is Total Count', () => {
      cleanup();
      render(
        <QueryStepsEditor
          query={{ ...defaultQuery, outputType: OutputType.TotalCount }}
          handleQueryChange={mockHandleQueryChange}
          datasource={mockDatasource}
        />
      );

      expect(screen.queryByText('Use time range')).toBeInTheDocument();
      expect(screen.queryByText('to filter by')).toBeInTheDocument();
    });
  });
});
