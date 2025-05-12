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
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'Workspace = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Workspace"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("Equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name); //value
    })

    it('should select part number in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, status,  'PartNumber = "partNumber1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Part number"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("Equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain("partNumber1"); //value
    });

    it('should select status in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'Status.statusType = "PASSED"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Status"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("Equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain("PASSED"); //value
    });

    it('should select global variable option', () => {
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'PartNumber = \"global_variable\"', [globalVariableOption]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("Part number"); //label
      expect(conditionsContainer.item(0)?.textContent).toContain("Equals"); //operator
      expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label); //value
    });

    it('should render multiple conditions in query builder', () => {
      const filter = '(PartNumber = "partNumber1" && ProgramName = "programName1") || Status.statusType = "FAILED"';
      const { renderResult, conditionsContainer } = renderElement([workspace], partNumber, status, filter);
      const filterConditions = renderResult.container.getElementsByClassName('smart-filter-group-condition');
      const logicalOperators = renderResult.container.getElementsByClassName('smart-filter-group-operator');
;    
      expect(conditionsContainer?.length).toBe(2);
      expect(filterConditions?.length).toBe(3);
      expect(logicalOperators?.length).toBe(2);

      expect(logicalOperators?.item(0)?.textContent).toContain("And");
      expect(logicalOperators?.item(1)?.textContent).toContain("Or");

      expect(filterConditions.item(0)?.textContent).toContain('partNumber1');
      expect(filterConditions.item(1)?.textContent).toContain('programName1');
      expect(filterConditions.item(2)?.textContent).toContain('FAILED');
    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
      it(`should select user friendly value for updated date`, () => {
        const { conditionsContainer } = renderElement([workspace], partNumber, status, `UpdatedAt > \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain("Updated"); //label
        expect(conditionsContainer.item(0)?.textContent).toContain("Greater than"); //operator
        expect(conditionsContainer.item(0)?.textContent).toContain(label); //value
      });
    });

    it('should sanitize fields in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, status, 'Family = "<script>alert(\'Family\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Family\')');
    })

    describe('theme', () => {  
      const mockUseTheme = jest.spyOn(require('@grafana/ui'), 'useTheme2');

      beforeEach(() => {
        jest.spyOn(document.body, 'setAttribute')
      });
      
      it('should set light theme when isDark is false', () => {
        mockUseTheme.mockReturnValue({ isDark: false });
        
        renderElement([], [], [], '');
       
        expect(document.body.setAttribute).toHaveBeenCalledWith('theme', 'orange');
      });
      it('should set dark theme when isDark is true', () => {
        mockUseTheme.mockReturnValue({ isDark: true });

        renderElement([], [], [], '');
  
        expect(document.body.setAttribute).toHaveBeenCalledWith('theme', 'dark-orange');
      });
    });
  });
});
