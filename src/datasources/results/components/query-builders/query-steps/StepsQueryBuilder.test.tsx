import { QueryBuilderOption, Workspace } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { StepsQueryBuilder } from './StepsQueryBuilder';

jest.mock('../../query-builders/query-results/ResultsQueryBuilder', () => ({
  ResultsQueryBuilder: jest.fn(({ filter, workspaces, partNumbers, status, globalVariableOptions, onChange }) => {
    return (
      <div data-testid="results-query-builder">
        <div data-testid="filter">{filter}</div>
        <div data-testid="workspaces">{JSON.stringify(workspaces)}</div>
        <div data-testid="part-numbers">{JSON.stringify(partNumbers)}</div>
        <div data-testid="status">{JSON.stringify(status)}</div>
        <div data-testid="global-vars">{JSON.stringify(globalVariableOptions)}</div>
        <button data-testid="trigger-change" onClick={() => onChange({ detail: { linq: 'workspace = "Workspace1"' } })}>
          Trigger Change
        </button>
      </div>
    );
  }),
}));

describe('StepsQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode;

    const containerClass = 'smart-element smart-query-builder';
    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
    const partNumber = ['partNumber1', 'partNumber2'];
    const stepsPath = ['path1', 'path2'];
    const status = ['PASSED', 'FAILED'];
;
    function renderElement(
      resultsFilter: string,
      stepsFilter: string,
      workspaces: Workspace[],
      partNumbers: string[],
      status: string[],
      stepsPath: string[],
      globalVariableOptions: QueryBuilderOption[] = [],
      disableResultsQueryBuilder: boolean,
    ) {
      reactNode = React.createElement(StepsQueryBuilder, {
        resultsFilter,
        stepsFilter,
        workspaces,
        partNumbers,
        status,
        stepsPath,
        globalVariableOptions,
        disableResultsQueryBuilder,
        onResultsFilterChange: jest.fn(),
        onStepsFilterChange: jest.fn(),
      });
      const renderResult = render(reactNode);
      return {
        renderResult,
        queryBuilderContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, queryBuilderContainer } = renderElement('', '', [], [], [], [], [], false);

      expect(queryBuilderContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    });

    it('should disbale results query builder', () => {
      const { queryBuilderContainer } = renderElement('', '', [], [], [], [], [], true);

      expect(queryBuilderContainer?.length).toBe(1);
      expect(queryBuilderContainer[0]?.getAttribute('aria-disabled')).toBe('true');
    });

    it('should select workspace in query builder', () => {
      const { renderResult } = renderElement('', 'workspace = "1"',[workspace], [], [], [], [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('workspace'); //label
      expect(filterContainer.item(0)?.textContent).toContain('Equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain(workspace.name); //value
    });

    it('should select steps path in query builder', () => {
      const { renderResult } = renderElement('', 'path = "path1"',[], [], [], stepsPath, [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Step path'); //label
      expect(filterContainer.item(0)?.textContent).toContain('Equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('path1'); //value
    });

    it('should select status in query builder', () => {
      const { renderResult } = renderElement('', 'status = "PASSED"', [], [], status, [], [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Status'); //label
      expect(filterContainer.item(0)?.textContent).toContain('Equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('PASSED'); //value
    });

    it('should select global variable option', () => {
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };
      const { renderResult } = renderElement('','path = "global_variable"', [], [], [], [], [globalVariableOption], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Step path'); //label
      expect(filterContainer.item(0)?.textContent).toContain('Equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain(globalVariableOption.label); //value
    });

    it('should render multiple conditions in query builder', () => {
      const filter = '(keywords = "keywords1" && stepName = "stepName1") || status = "FAILED"';
      const { renderResult } = renderElement('', filter, [workspace], partNumber, status, stepsPath, [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');
      const filterConditions = renderResult.container.getElementsByClassName('smart-filter-group-condition');
      const logicalOperators = renderResult.container.getElementsByClassName('smart-filter-group-operator');

      expect(filterContainer?.length).toBe(2);
      expect(filterConditions?.length).toBe(3);
      expect(logicalOperators?.length).toBe(2);

      expect(logicalOperators?.item(0)?.textContent).toContain('And');
      expect(logicalOperators?.item(1)?.textContent).toContain('Or');

      expect(filterConditions.item(0)?.textContent).toContain('keywords1');
      expect(filterConditions.item(1)?.textContent).toContain('stepName1');
      expect(filterConditions.item(2)?.textContent).toContain('FAILED');
    });

    [
      ['${__from:date}', 'From'],
      ['${__to:date}', 'To'],
      ['${__now:date}', 'Now'],
    ].forEach(([value, label]) => {
      it(`should select user friendly value for updated date`, () => {
        const { renderResult } = renderElement('', `updatedAt > \"${value}\"`, [], [], [], [], [], false);
        const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

        expect(filterContainer?.length).toBe(1);
        expect(filterContainer.item(0)?.textContent).toContain('Step updated at'); //label
        expect(filterContainer.item(0)?.textContent).toContain('Greater than'); //operator
        expect(filterContainer.item(0)?.textContent).toContain(label); //value
      });
    });

    it('should sanitize fields in query builder', () => {
      const { queryBuilderContainer } = renderElement('', 'Family = "<script>alert(\'Family\')</script>"', [], [], [], [], [], false);

      expect(queryBuilderContainer?.length).toBe(1);
      expect(queryBuilderContainer.item(0)?.innerHTML).not.toContain("alert('Family')");
    });

    describe('theme', () => {
      const mockUseTheme = jest.spyOn(require('@grafana/ui'), 'useTheme2');

      beforeEach(() => {
        jest.spyOn(document.body, 'setAttribute');
      });

      it('should set light theme when isDark is false', () => {
        mockUseTheme.mockReturnValue({ isDark: false });

        renderElement('', '', [], [], [], [], [], false);

        expect(document.body.setAttribute).toHaveBeenCalledWith('theme', 'orange');
      });
      it('should set dark theme when isDark is true', () => {
        mockUseTheme.mockReturnValue({ isDark: true });

        renderElement('', '', [], [], [], [], [], false);

        expect(document.body.setAttribute).toHaveBeenCalledWith('theme', 'dark-orange');
      });
    });
  });
});
