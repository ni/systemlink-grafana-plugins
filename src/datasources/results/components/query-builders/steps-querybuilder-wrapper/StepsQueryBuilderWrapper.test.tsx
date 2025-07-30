import React from 'react';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import { StepsQueryBuilderWrapper } from './StepsQueryBuilderWrapper';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import userEvent from '@testing-library/user-event';
import { Workspace } from 'core/types';

jest.mock('../query-results/ResultsQueryBuilder', () => ({
  ResultsQueryBuilder: jest.fn(({ filter, workspaces, status, partNumbers, globalVariableOptions, onChange }) => {
    return (
      <div data-testid="results-query-builder">
        <div data-testid="results-filter">{filter}</div>
        <div data-testid="results-workspaces">{JSON.stringify(workspaces)}</div>
        <div data-testid="results-part-numbers">{JSON.stringify(partNumbers)}</div>
        <div data-testid="results-status">{JSON.stringify(status)}</div>
        <div data-testid="results-global-vars">{JSON.stringify(globalVariableOptions)}</div>
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
    ({ filter, workspaces, stepStatus, stepsPath, globalVariableOptions, disableQueryBuilder, onFilterChange }) => {
      return (
        <div data-testid="steps-query-builder">
          <div data-testid="steps-filter">{filter}</div>
          <div data-testid="steps-workspaces">{JSON.stringify(workspaces)}</div>
          <div data-testid="steps-status">{JSON.stringify(stepStatus)}</div>
          <div data-testid="steps-path">{JSON.stringify(stepsPath)}</div>
          <div data-testid="steps-global-vars">{JSON.stringify(globalVariableOptions)}</div>
          <button data-testid="steps-trigger-change" onClick={() => onFilterChange('newStepsQuery')}>
            Trigger Steps Change
          </button>
          <div data-testid="disable-steps-query-builder">{disableQueryBuilder.toString()}</div>
        </div>
      );
    }
  ),
}));

const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'workspace1',
    default: false,
    enabled: true,
  },
  {
    id: '2',
    name: 'workspace2',
    default: false,
    enabled: true,
  },
];

const mockDatasource = {
  globalVariableOptions: jest.fn().mockReturnValue(['var1', 'var2']),
  getStepPaths: jest.fn().mockReturnValue([]),
  workspacesCache: Promise.resolve(new Map(mockWorkspaces.map(ws => [ws.id, ws]))),
  partNumbersCache: Promise.resolve(['PN1', 'PN2']),
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

  test('should render empty workspaces when promise resolve to empty value', async () => {
    cleanup();
    const emptyDatasource = {
      globalVariableOptions: jest.fn().mockReturnValue([]),
      workspacesCache: Promise.resolve(new Map()),
      getStepPaths: jest.fn().mockReturnValue([]),
    } as unknown as QueryStepsDataSource;

    jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(<StepsQueryBuilderWrapper {...defaultProps} datasource={emptyDatasource} />);
    });

    expect(screen.getByTestId('results-workspaces').textContent).toBe('[]');
    expect(screen.getByTestId('steps-workspaces').textContent).toBe('[]');
  });

  test('should render empty part numbers and step path when promise resolves to empty value', async () => {
    cleanup();
    const emptyDatasource = {
      globalVariableOptions: jest.fn().mockReturnValue([]),
      workspacesCache: Promise.resolve(new Map(mockWorkspaces.map(ws => [ws.id, ws]))),
      partNumbersCache: Promise.resolve([]),
      getStepPaths: jest.fn().mockReturnValue([]),
    } as unknown as QueryStepsDataSource;

    await act(async () => {
      render(<StepsQueryBuilderWrapper {...defaultProps} datasource={emptyDatasource} />);
    })

    expect(screen.getByTestId('results-part-numbers').textContent).toBe('[]');
    expect(screen.getByTestId('steps-path').textContent).toBe('[]');
  });

  test('should pass default properties to result and steps query builder', () => {
    expect(screen.getByTestId('results-filter').textContent).toBe('partNumber = "PN1"');
    expect(screen.getByTestId('results-workspaces').textContent).toEqual(
      JSON.stringify([
        { id: '1', name: 'workspace1', default: false, enabled: true },
        { id: '2', name: 'workspace2', default: false, enabled: true },
      ])
    );
    expect(screen.getByTestId('results-part-numbers').textContent).toEqual(JSON.stringify(['PN1', 'PN2']));
    expect(screen.getByTestId('results-global-vars').textContent).toEqual(JSON.stringify(['var1', 'var2']));
    expect(screen.getByTestId('results-status').textContent).toEqual(JSON.stringify(['PASS', 'FAIL']));

    expect(screen.getByTestId('steps-filter').textContent).toBe('stepName = "Step1"');
    expect(screen.getByTestId('steps-workspaces').textContent).toEqual(
      JSON.stringify([
        { id: '1', name: 'workspace1', default: false, enabled: true },
        { id: '2', name: 'workspace2', default: false, enabled: true },
      ])
    );
    expect(screen.getByTestId('steps-status').textContent).toEqual(JSON.stringify(['PASS', 'FAIL']));
    expect(screen.getByTestId('steps-path').textContent).toEqual(JSON.stringify([]));
    expect(screen.getByTestId('steps-global-vars').textContent).toEqual(JSON.stringify(['var1', 'var2']));
    expect(screen.getByTestId('disable-steps-query-builder').textContent).toBe('false');
  });

  test('should update stepsPath when stepsPathChangeCallback is triggered', async () => {
    cleanup();
    let callback: (() => void) | undefined;
    const mockDatasource = {
      getStepPaths: jest.fn().mockReturnValue([
        { label: 'Parent\nChild path', value: 'Parent\\Child path' },
        { label: 'Only parent path', value: 'Only parent path' },
      ]),
      workspacesCache: Promise.resolve(new Map()),
      globalVariableOptions: jest.fn().mockReturnValue([]),
    } as any;

    await act(async () => {
      render(
        <StepsQueryBuilderWrapper
        {...defaultProps}
          datasource={mockDatasource}
        />
      );
    });

    callback && callback();

    expect(mockDatasource.getStepPaths).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('steps-path').textContent).toEqual(
        JSON.stringify([
          { label: 'Parent\nChild path', value: 'Parent\\Child path' },
          { label: 'Only parent path', value: 'Only parent path' },
        ])
      );
    });
  });

  test('should load initial stepsPath on mount', async () => {
    cleanup();
    const mockDatasource = {
      getStepPaths: jest.fn().mockReturnValue([
        { label: 'initPath1', value: 'initPath1' },
        { label: 'initPath2', value: 'initPath2' },
      ]),
      workspacesCache: Promise.resolve(new Map()),
      globalVariableOptions: jest.fn().mockReturnValue([]),
    } as any;

    await act(async () => {
      render(
        <StepsQueryBuilderWrapper
          {...defaultProps}
          datasource={mockDatasource}
        />
      );
    });

    expect(mockDatasource.getStepPaths).toHaveBeenCalled();
    expect(screen.getByTestId('steps-path').textContent).toEqual(
      JSON.stringify([
        { label: 'initPath1', value: 'initPath1' },
        { label: 'initPath2', value: 'initPath2' },
      ])
    );
  });

  test('should disable StepsQueryBuilder when disableStepsQueryBuilder property is true', async () => {
    cleanup();

    await act(async () => {
      render(<StepsQueryBuilderWrapper {...defaultProps} disableStepsQueryBuilder={true} />);
    });

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
