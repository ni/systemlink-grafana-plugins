import { QueryBuilderOption, Workspace } from 'core/types';
import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { StepsQueryBuilder } from './StepsQueryBuilder';
import { StepPath } from 'datasources/results/types/QuerySteps.types';

describe('StepsQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode;

    const containerClass = 'smart-element smart-query-builder';
    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
    const stepPaths = [
      {label: 'Parent Path\Child Path1\Child Path2', value: 'Parent Path\nChild Path1\nChild Path2'},
      {label: 'Another Path', value: 'Another Path'},
    ]
    const status = ['PASSED', 'FAILED'];

    function renderElement(
      filter: string,
      workspaces: Workspace[] | null,
      stepStatus: string[],
      stepsPath: StepPath[],
      globalVariableOptions: QueryBuilderOption[] = [],
      disableQueryBuilder: boolean,
    ) {
      reactNode = React.createElement(StepsQueryBuilder, {
        filter,
        workspaces,
        stepStatus,
        stepsPath,
        globalVariableOptions,
        disableQueryBuilder,
        onFilterChange: jest.fn(),
      });
      const renderResult = render(reactNode);
      return {
        renderResult,
        queryBuilderContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, queryBuilderContainer } = renderElement('', [], [], [], [], false);

      expect(queryBuilderContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    });

    it('should disable steps query builder when disableQueryBuilder property is true', () => {
      const { queryBuilderContainer } = renderElement('', [], [], [], [], true);

      expect(queryBuilderContainer?.length).toBe(1);
      expect(queryBuilderContainer[0]?.getAttribute('aria-disabled')).toBe('true');
    });

    it('should select workspace in query builder', () => {
      const { renderResult } = renderElement('workspace = "1"',[workspace], [], [], [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('workspace'); //label
      expect(filterContainer.item(0)?.textContent).toContain('equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain(workspace.name); //value
    });

    it('should select steps path in query builder', () => {
      const { renderResult } = renderElement('path = "Parent Path\nChild Path1\nChild Path2"',[], [], stepPaths, [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Step path'); //label
      expect(filterContainer.item(0)?.textContent).toContain('equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('Parent Path\Child Path1\Child Path2'); //value in the dropdown
    });

    it('should update and display the latest step path in the query builder', () => {
      const { renderResult } = renderElement('path = "Parent Path\nChild Path1\nChild Path2"',[], [], stepPaths, [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Step path'); //label
      expect(filterContainer.item(0)?.textContent).toContain('equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('Parent Path\Child Path1\Child Path2'); //value in the dropdown

      // Update the step paths
      const updatedStepPaths = [
        {label: 'Updated Path\Child Path1', value: 'Updated Path\nChild Path1'},
      ];
      renderResult.rerender(React.createElement(StepsQueryBuilder, {
        filter: 'path = "Updated Path\nChild Path1"',
        workspaces: [workspace],
        stepStatus: [],
        stepsPath: updatedStepPaths,
        globalVariableOptions: [],
        disableQueryBuilder: false,
        onFilterChange: jest.fn(),
      }));

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Step path'); //label
      expect(filterContainer.item(0)?.textContent).toContain('equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('Updated Path\Child Path1'); //value in the dropdown
    });

    it('should select status in query builder', () => {
      const { renderResult } = renderElement('status.statusType = "PASSED"', [], status, [], [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Step status'); //label
      expect(filterContainer.item(0)?.textContent).toContain('equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('PASSED'); //value
    });

    it('should select keyword in query builder', () => {
      const { renderResult } = renderElement('keywords.Any(it.Contains("keyword1"))', [], [], [], [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain("Step keywords"); //label
      expect(filterContainer.item(0)?.textContent).toContain("contains"); //operator
      expect(filterContainer.item(0)?.textContent).toContain("keyword1"); //value
    });

    it('should select "has children" property in query builder', () => {
      const { renderResult } = renderElement('hasChildren = "True"', [], [], [], [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Has children'); //label
      expect(filterContainer.item(0)?.textContent).toContain('equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('True'); //value
    })

    it('should select global variable option', () => {
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };
      const { renderResult } = renderElement('path = "global_variable"', [], [], [], [globalVariableOption], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Step path'); //label
      expect(filterContainer.item(0)?.textContent).toContain('equals'); //operator
      expect(filterContainer.item(0)?.textContent).toContain(globalVariableOption.label); //value
    });

    it('should render multiple conditions in query builder', () => {
      const filter = '(keywords.Contains("keyword1") && name = "stepName1") || status.statusType = "FAILED"';
      const { renderResult } = renderElement(filter, [workspace], status, stepPaths, [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');
      const filterConditions = renderResult.container.getElementsByClassName('smart-filter-group-condition');
      const logicalOperators = renderResult.container.getElementsByClassName('smart-filter-group-operator');

      expect(filterContainer?.length).toBe(2);
      expect(filterConditions?.length).toBe(3);
      expect(logicalOperators?.length).toBe(2);

      expect(logicalOperators?.item(0)?.textContent).toContain('And');
      expect(logicalOperators?.item(1)?.textContent).toContain('Or');

      expect(filterConditions.item(0)?.textContent).toContain('keyword1');
      expect(filterConditions.item(1)?.textContent).toContain('stepName1');
      expect(filterConditions.item(2)?.textContent).toContain('FAILED');
    });

    [
      ['${__from:date}', 'From'],
      ['${__to:date}', 'To'],
      ['${__now:date}', 'Now'],
    ].forEach(([value, label]) => {
      it(`should select user friendly value for updated date`, () => {
        const { renderResult } = renderElement(`updatedAt > \"${value}\"`, [], [], [], [], false);
        const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

        expect(filterContainer?.length).toBe(1);
        expect(filterContainer.item(0)?.textContent).toContain('Step updated at'); //label
        expect(filterContainer.item(0)?.textContent).toContain('is after'); //operator
        expect(filterContainer.item(0)?.textContent).toContain(label); //value
      });
    });

    it('should sanitize fields in query builder', () => {
      const { queryBuilderContainer } = renderElement('Family = "<script>alert(\'Family\')</script>"', [], [], [], [], false);

      expect(queryBuilderContainer?.length).toBe(1);
      expect(queryBuilderContainer.item(0)?.innerHTML).not.toContain("alert('Family')");
    });

    it('should not set workspace field when workspace is null', () => {
      const { renderResult } = renderElement('workspace = "1"', null, [], [], [], false);
      const filterContainer = renderResult.container.getElementsByClassName('smart-filter-group-condition-container');

      expect(filterContainer?.length).toBe(1);
      expect(filterContainer.item(0)?.textContent).toContain('Property'); //label
      expect(filterContainer.item(0)?.textContent).toContain('Operator'); //operator
      expect(filterContainer.item(0)?.textContent).toContain('Value'); //value
    });

    describe('theme', () => {
      const mockUseTheme = jest.spyOn(require('@grafana/ui'), 'useTheme2');

      beforeEach(() => {
        jest.spyOn(document.body, 'setAttribute');
      });

      it('should set light theme when isDark is false', () => {
        mockUseTheme.mockReturnValue({ isDark: false });

        renderElement('', [], [], [], [], false);

        expect(document.body.setAttribute).toHaveBeenCalledWith('theme', 'orange');
      });
      it('should set dark theme when isDark is true', () => {
        mockUseTheme.mockReturnValue({ isDark: true });

        renderElement('', [], [], [], [], false);

        expect(document.body.setAttribute).toHaveBeenCalledWith('theme', 'dark-orange');
      });
    });
  });
});
