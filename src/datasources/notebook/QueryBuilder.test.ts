import React, { ReactNode } from "react";
import { TestResultsQueryBuilder } from "./QueryBuilder";
import { render } from "@testing-library/react";

describe('QueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode

    const containerClass = 'smart-filter-group-condition-container';

    function renderElement(filter?: string) {
      reactNode = React.createElement(TestResultsQueryBuilder, { defaultValue: filter, autoComplete: () => Promise.resolve([]), onChange: jest.fn()});
      const renderResult = render(reactNode);
      return {
        renderResult,
        conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, conditionsContainer } = renderElement("");

      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    })

    it('should select partNumber and seralNumber in query builder', () => {
      const { conditionsContainer } = renderElement('partNumber = "P_number" && serialNumber = "SomeRandomModelName"');

      expect(conditionsContainer?.length).toBe(2);
      expect(conditionsContainer.item(0)?.textContent).toContain("P_number");
      expect(conditionsContainer.item(1)?.textContent).toContain("SomeRandomModelName");
    })

    it('should select a sanitized PartNumber in query builder', () => {
      const { conditionsContainer } = renderElement('partNumber = "<script>alert(\'PartNumber\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'PartNumber\')');
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('<script>');
    })
  });
});
