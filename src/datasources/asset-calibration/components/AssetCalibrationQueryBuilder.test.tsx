import React, { ReactNode } from "react";
import { AssetCalibrationQueryBuilder } from "./AssetCalibrationQueryBuilder";
import { render } from "@testing-library/react";
import { Workspace } from "core/types";

describe('AssetCalibrationQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode;

    const containerClass = 'smart-filter-group-condition-container'

    function renderElement(workspaces: Workspace[], filter?: string) {
      reactNode = React.createElement(AssetCalibrationQueryBuilder, { workspaces, filter, onChange: jest.fn() });
      const renderResult = render(reactNode);
      return {
        renderResult,
        conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, conditionsContainer } = renderElement([], '');
      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    })

    it('should populate query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace
      const { conditionsContainer } = renderElement([workspace], 'Workspace = "1" && ModelName = "SomeRandomModelName"');

      expect(conditionsContainer?.length).toBe(2);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
      expect(conditionsContainer.item(1)?.textContent).toContain("SomeRandomModelName");
    })
  })
})
