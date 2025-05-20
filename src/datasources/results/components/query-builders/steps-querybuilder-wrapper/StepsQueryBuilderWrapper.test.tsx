import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { StepsQueryBuilderWrapper } from './StepsQueryBuilderWrapper';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import userEvent from '@testing-library/user-event';

jest.mock('../query-results/ResultsQueryBuilder', () => ({
  ResultsQueryBuilder: jest.fn(({ filter, workspaces, partNumbers, status, globalVariableOptions, onChange, areDependenciesLoaded }) => {
    return (
      <div data-testid="results-query-builder">
        <div data-testid="results-filter">{filter}</div>
        <div data-testid="results-workspaces">{JSON.stringify(workspaces)}</div>
        <div data-testid="results-part-numbers">{JSON.stringify(partNumbers)}</div>
        <div data-testid="results-status">{JSON.stringify(status)}</div>
        <div data-testid="results-global-vars">{JSON.stringify(globalVariableOptions)}</div>
        <div data-testid="results-are-dependencies-loaded">{areDependenciesLoaded.toString()}</div>
        <button
          data-testid="results-trigger-change"
          onClick={() => onChange(new CustomEvent('change', { detail: { linq: 'newResultsQuery' } }))}
        >
          Trigger Results Change
        </button>
      </div>
    );
  }),
}));

jest.mock('../query-steps/StepsQueryBuilder', () => ({
  StepsQueryBuilder: jest.fn(
    ({ filter, workspaces, stepStatus, stepsPath, globalVariableOptions, disableQueryBuilder, onFilterChange, areDependenciesLoaded }) => {
      return (
        <div data-testid="steps-query-builder">
          <div data-testid="steps-filter">{filter}</div>
          <div data-testid="steps-workspaces">{JSON.stringify(workspaces)}</div>
          <div data-testid="steps-status">{JSON.stringify(stepStatus)}</div>
          <div data-testid="steps-path">{JSON.stringify(stepsPath)}</div>
          <div data-testid="steps-global-vars">{JSON.stringify(globalVariableOptions)}</div>
          <div data-testid="steps-are-dependencies-loaded">{areDependenciesLoaded.toString()}</div>
          <button data-testid="steps-trigger-change" onClick={() => onFilterChange('newStepsQuery')}>
            Trigger Steps Change
          </button>
          <div data-testid="disable-steps-query-builder">{disableQueryBuilder.toString()}</div>
        </div>
      );
    }
  ),
}));

const mockDatasource = {
  loadWorkspaces: jest.fn().mockResolvedValue(undefined),
  getPartNumbers: jest.fn().mockResolvedValue(undefined),
  workspacesCache: new Map([
    [1, { id: 1, name: 'Workspace 1' }],
    [2, { id: 2, name: 'Workspace 2' }],
  ]),
  partNumbersCache: ['PN1', 'PN2'],
  globalVariableOptions: jest.fn().mockReturnValue(['var1', 'var2']),
} as unknown as QueryStepsDataSource;

jest.mock('core/utils', () => ({
  enumToOptions: jest.fn().mockReturnValue([
    { value: 'PASS', label: 'Pass' },
    { value: 'FAIL', label: 'Fail' },
  ]),
}));

describe('StepsQueryBuilderWrapper', () => {
  const defaultProps = {
    datasource: mockDatasource,
    resultsQuery: 'partNumber = "PN1"',
    stepsQuery: 'stepName = "Step1"',
    onResultsQueryChange: jest.fn(),
    onStepsQueryChange: jest.fn(),
    disableStepsQueryBuilder: false,
  };

  beforeEach(async () => {
    await act(async () => {
      render(<StepsQueryBuilderWrapper {...defaultProps} />);
    });
  });

  test('should render results and steps query builder', () => {
    expect(screen.getByText('Query by results properties')).toBeInTheDocument();
    expect(screen.getByText('Query by steps properties')).toBeInTheDocument();
    expect(screen.getByTestId('results-query-builder')).toBeInTheDocument();
    expect(screen.getByTestId('steps-query-builder')).toBeInTheDocument();
  });
  
  test('should load workspaces and part numbers from datasource', () => {
    expect(mockDatasource.loadWorkspaces).toHaveBeenCalledTimes(1);
    expect(mockDatasource.getPartNumbers).toHaveBeenCalledTimes(1);
  });

  test('should pass default properties to result and steps query builder', () => {
    expect(screen.getByTestId('results-filter').textContent).toBe('partNumber = "PN1"');
    expect(screen.getByTestId('results-workspaces').textContent).toEqual(
      JSON.stringify([
        { id: 1, name: 'Workspace 1' },
        { id: 2, name: 'Workspace 2' },
      ])
    );
    expect(screen.getByTestId('results-part-numbers').textContent).toEqual(JSON.stringify(['PN1', 'PN2']));
    expect(screen.getByTestId('results-global-vars').textContent).toEqual(JSON.stringify(['var1', 'var2']));
    expect(screen.getByTestId('results-status').textContent).toEqual(JSON.stringify(['PASS', 'FAIL']));
    expect(screen.getByTestId('results-are-dependencies-loaded').textContent).toBe('true');

    expect(screen.getByTestId('steps-filter').textContent).toBe('stepName = "Step1"');
    expect(screen.getByTestId('steps-workspaces').textContent).toEqual(
      JSON.stringify([
        { id: 1, name: 'Workspace 1' },
        { id: 2, name: 'Workspace 2' },
      ])
    );
    expect(screen.getByTestId('steps-status').textContent).toEqual(JSON.stringify(['PASS', 'FAIL']));
    expect(screen.getByTestId('steps-path').textContent).toEqual(JSON.stringify([]));
    expect(screen.getByTestId('steps-global-vars').textContent).toEqual(JSON.stringify(['var1', 'var2']));
    expect(screen.getByTestId('disable-steps-query-builder').textContent).toBe('false');
    expect(screen.getByTestId('steps-are-dependencies-loaded').textContent).toBe('true');
  });

  test('should disable StepsQueryBuilder when disableStepsQueryBuilder property is true', () => {
    cleanup();

    render(<StepsQueryBuilderWrapper {...defaultProps} disableStepsQueryBuilder={true} />);

    expect(screen.getByTestId('disable-steps-query-builder').textContent).toBe('true');
  });

  test('should call onResultsQueryChange when ResultsQueryBuilder changes', async () => {
    await userEvent.click(screen.getByTestId('results-trigger-change'));

    expect(defaultProps.onResultsQueryChange).toHaveBeenCalledWith('newResultsQuery');
  });

  test('should call onStepsQueryChange when StepsQueryBuilder changes', async () => {
    await userEvent.click(screen.getByTestId('steps-trigger-change'));

    expect(defaultProps.onStepsQueryChange).toHaveBeenCalledWith('newStepsQuery');
  });
});
