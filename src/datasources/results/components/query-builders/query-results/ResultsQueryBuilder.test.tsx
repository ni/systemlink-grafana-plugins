import { QueryBuilderOption, Workspace } from "core/types";
import React, { ReactNode } from "react";
import { ResultsQueryBuilder } from "./ResultsQueryBuilder";
import { render } from "@testing-library/react";

describe('ResultsQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode

    const containerClass = 'smart-filter-group-condition-container';
    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
    const partNumber = ['partNumber1', 'partNumber2'];
    const status = ['PASSED', 'FAILED'];

    function renderElement(workspaces: Workspace[], partNumbers: string[], status: string[], filter: string, globalVariableOptions: QueryBuilderOption[] = []) {
      reactNode = React.createElement(ResultsQueryBuilder, { filter, workspaces, partNumbers, status, globalVariableOptions, onChange: jest.fn(), });
      const renderResult = render(reactNode);
      return {
        renderResult,
        conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, conditionsContainer } = renderElement([], [], [], '');

      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    })

    it('should select workspace in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'Workspace = "1" && PartNumber = "partNumber1"');

      expect(conditionsContainer?.length).toBe(2);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
      expect(conditionsContainer.item(1)?.textContent).toContain("partNumber1");
    })

    it('should select part number in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, status,  'PartNumber = "partNumber1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("partNumber1");
    });

    it('should select status in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'Status = "PASSED"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("PASSED");
    });

    it('should select global variable option', () => {
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'PartNumber = \"global_variable\"', [globalVariableOption]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
      it(`should select user friendly value for updated date`, () => {
        const { conditionsContainer } = renderElement([workspace], partNumber, status, `UpdatedAt > \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
      });
    });

    it('should sanitize fields in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'Family = "<script>alert(\'Family\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Family\')');
    })
  });
});
