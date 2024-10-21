import React, { ReactNode } from "react";
import { CalibrationForecastQueryBuilder } from "./CalibrationForecastQueryBuilder";
import { render } from "@testing-library/react";
import { Workspace } from "core/types";
import { SystemProperties } from "datasources/system/types";

describe('CalibrationForecastQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode

    const containerClass = 'smart-filter-group-condition-container'

    function renderElement(workspaces: Workspace[], systems: SystemProperties[], filter?: string) {
      reactNode = React.createElement(CalibrationForecastQueryBuilder, { workspaces, systems, filter, globalVariableOptions: [], onChange: jest.fn(), areDependenciesLoaded: true });
      const renderResult = render(reactNode);
      return {
        renderResult,
        conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`)
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, conditionsContainer } = renderElement([], [], '');
      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
    })

    it('should select workspace in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemProperties;
      const { conditionsContainer } = renderElement([workspace], [system], 'Workspace = "1" && ModelName = "SomeRandomModelName"');

      expect(conditionsContainer?.length).toBe(2);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
      expect(conditionsContainer.item(1)?.textContent).toContain("SomeRandomModelName");
    })

    it('should select system in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemProperties;

      const { conditionsContainer } = renderElement([workspace], [system], 'Location = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(system.alias);
    });
  });
});
