import React, { ReactNode } from 'react';
import { AssetQueryBuilder } from './AssetQueryBuilder';
import { render } from '@testing-library/react';
import { QueryBuilderOption, Workspace } from 'core/types';
import { SystemMetadata } from 'datasources/system/types';
import { QueryBuilderType } from 'datasources/asset/constants/constants';

describe('AssetQueryBuilder', () => {
  describe('useEffects', () => {
    let reactNode: ReactNode;

    const containerClass = 'smart-filter-group-condition-container';

    function renderElement(workspaces: Workspace[], systems: SystemMetadata[], filter?: string, globalVariableOptions: QueryBuilderOption[] = [], complexFilterEnabled = true, queryBuilderType = QueryBuilderType.Simple) {
      reactNode = React.createElement(AssetQueryBuilder, {
        workspaces,
        systems,
        filter,
        globalVariableOptions,
        onChange: jest.fn(),
        areDependenciesLoaded: true,
        query: {queryBuilderType: queryBuilderType} as any,
        handleQueryChange: jest.fn(),
        complexFilterEnabled: complexFilterEnabled,
      });
      const renderResult = render(reactNode);
      return {
        renderResult,
        conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
      };
    }

    it('should render empty query builder', () => {
      const { renderResult, conditionsContainer } = renderElement([], [], '');
      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
      expect(renderResult.queryByText('Advanced')).not.toBeNull();
    });

    it('should not render complex option if complexFilterEnabled is disabled', () => {
      const { renderResult, conditionsContainer } = renderElement([], [], '', [], false);
      expect(conditionsContainer.length).toBe(1);
      expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
      expect(renderResult.queryByText('Advanced')).toBeNull();
    });

    it('should select workspace in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemMetadata;
      const { conditionsContainer } = renderElement([workspace], [system], 'Workspace = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(workspace.name);
    });

    it('should select system in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemMetadata;

      const { conditionsContainer } = renderElement([workspace], [system], 'Location = "1"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(system.alias);
    });

    it('should select global variable option', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemMetadata;
      const globalVariableOption = { label: 'Global variable', value: 'global_variable' };

      const { conditionsContainer } = renderElement([workspace], [system], 'AssetType = \"global_variable\"', [globalVariableOption]);

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.textContent).toContain(globalVariableOption.label);
    });

    [['${__from:date}', 'From'], ['${__to:date}', 'To'], ['${__now:date}', 'Now']].forEach(([value, label]) => {
      it(`should select user friendly value for calibration due date`, () => {
        const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
        const system = { id: '1', alias: 'Selected system' } as SystemMetadata;

        const { conditionsContainer } = renderElement([workspace], [system], `ExternalCalibration.NextRecommendedDate > \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        expect(conditionsContainer.item(0)?.textContent).toContain(label);
      });
    });

    it('should select a sanitized Workspace in query builder', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemMetadata;
      const { conditionsContainer } = renderElement([workspace], [system], 'Workspace = "<script>alert(\'Workspace\')</script>"');

      expect(conditionsContainer?.length).toBe(1);
      expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Workspace\')');
    })

    it('should render the filter when advanced option is selected', () => {
      const workspace = { id: '1', name: 'Selected workspace' } as Workspace;
      const system = { id: '1', alias: 'Selected system' } as SystemMetadata;

      const { renderResult } = renderElement([workspace], [system], 'Location = "1"', [], true, QueryBuilderType.Advanced);

      expect(renderResult.queryByText('Location = "1"')).not.toBeNull();
    })
  });
});
