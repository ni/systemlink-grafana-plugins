import { QueryBuilderOption, Workspace } from "core/types";
import React, { ReactNode } from "react";
import { ProductsQueryBuilder } from "./ProductsQueryBuilder";
import { render } from "@testing-library/react";

describe('ProductsQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode

    const containerClass = 'smart-filter-group-condition-container';
    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
    const partNumber = ['partNumber1', 'partNumber2'];
    const familyNames = ['familyName1', 'familyName2'];

    function renderElement(workspaces: Workspace[], partNumbers: string[], familyNames: string[], filter: string, globalVariableOptions: QueryBuilderOption[] = []) {
      reactNode = React.createElement(ProductsQueryBuilder, { filter, workspaces, partNumbers, globalVariableOptions, familyNames, onChange: jest.fn(), });
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
      const { conditionsContainer } = renderElement([workspace], partNumber, familyNames, 'Workspace = "1" && PartNumber = "partNumber1"');

      expect(conditionsContainer?.length).toBe(2);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
      expect(conditionsContainer.item(1)?.textContent).toContain("partNumber1");
    })

    it('should select part number in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, familyNames,  'PartNumber = "partNumber1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("partNumber1");
    });

    it('should select family names in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, familyNames, 'Family = "familyName1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("familyName1");
    });

    it('should select global variable option', () => {
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };
      const { conditionsContainer } = renderElement([workspace], partNumber, familyNames, 'PartNumber = \"global_variable\"', [globalVariableOption]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
      it(`should select user friendly value for updated date`, () => {
        const { conditionsContainer } = renderElement([workspace], partNumber, familyNames, `UpdatedAt > \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
      });
    });

    it('should sanitize fields in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], partNumber, familyNames, 'Family = "<script>alert(\'Family\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Family\')');
    })
  });
});
