import React, { ReactNode } from "react";
import { CalibrationForecastQueryBuilder } from "./CalibrationForecastQueryBuilder";
import { render } from "@testing-library/react";
import { QueryBuilderOption, Workspace } from "core/types";
import { SystemProperties } from "datasources/system/types";
import { LocationModel } from "datasources/asset/types/ListLocations.types";

describe('CalibrationForecastQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode

    const containerClass = 'smart-filter-group-condition-container';
    const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
    const system = { id: '1', alias: 'Selected system' } as SystemProperties;
    const location = { id: 'location-1', name: 'Location 1' } as LocationModel;

    function renderElement(workspaces: Workspace[], systems: SystemProperties[], locations: LocationModel[], filter?: string, globalVariableOptions: QueryBuilderOption[] = []) {
      reactNode = React.createElement(CalibrationForecastQueryBuilder, { workspaces, systems, locations, filter, globalVariableOptions, onChange: jest.fn(), areDependenciesLoaded: true });
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
      const { conditionsContainer } = renderElement([workspace], [system], [location], 'Workspace = "1" && ModelName = "SomeRandomModelName"');

      expect(conditionsContainer?.length).toBe(2);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
      expect(conditionsContainer.item(1)?.textContent).toContain("SomeRandomModelName");
    })

    it('should select partnumber in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], [system], [location], 'PartNumber = "PartNumber_123"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("PartNumber_123");
    })

    it('should select asset identifier in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], [system], [location], 'AssetIdentifier = "AssetIdentifier_123"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain("AssetIdentifier_123");
    })

    it('should select system in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], [system], [location], 'Location = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(system.alias);
    });

    it('should select physical location in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], [system], [location], 'Location = "location-1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(location.name);
    });

    it('should select global variable option', () => {
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };
      const { conditionsContainer } = renderElement([workspace], [system], [location], 'AssetType = \"global_variable\"', [globalVariableOption]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
    });

    it('should select a sanitized ModelName in query builder', () => {
      const { conditionsContainer } = renderElement([workspace], [system], [location], 'ModelName = "<script>alert(\'ModelName\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'ModelName\')');
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('<script>');
    })
  });
});
