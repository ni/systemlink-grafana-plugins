import React from 'react';
import { render } from '@testing-library/react';
import { AlarmsQueryBuilder } from './AlarmsQueryBuilder';
import { QueryBuilderOption } from 'core/types';

describe('AlarmsQueryBuilder', () => {
  function renderElement(filter: string, globalVariableOptions: QueryBuilderOption[] = []) {
    const reactNode = React.createElement(AlarmsQueryBuilder, { filter, globalVariableOptions, onChange: jest.fn() });
    const renderResult = render(reactNode);
    const containerClass = 'smart-filter-group-condition-container';

    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
    };
  }

  it('should render empty query builder', () => {
    const { renderResult, conditionsContainer } = renderElement('');

    expect(conditionsContainer.length).toBe(1);
    expect(renderResult.getByLabelText('Empty condition row')).toBeTruthy();
  });

  [['true', 'True'], ['false', 'False']].forEach(([value, label]) => {
    it(`should select ${label} for acknowledged in query builder`, () => {
        const { conditionsContainer } = renderElement(`acknowledged = \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        const conditionText = conditionsContainer.item(0)?.textContent;
        expect(conditionText).toContain('Acknowledged');
        expect(conditionText).toContain('equals');
        expect(conditionText).toContain(label);       
    });
    
    it(`should select ${label} for active in query builder`, () => {
        const { conditionsContainer } = renderElement(`active = \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        const conditionText = conditionsContainer.item(0)?.textContent;
        expect(conditionText).toContain('Active');
        expect(conditionText).toContain('equals');
        expect(conditionText).toContain(label);
    });

    it(`should select ${label} for clear in query builder`, () => {
        const { conditionsContainer } = renderElement(`clear = \"${value}\"`);

        expect(conditionsContainer?.length).toBe(1);
        const conditionText = conditionsContainer.item(0)?.textContent;
        expect(conditionText).toContain('Clear');
        expect(conditionText).toContain('equals');
        expect(conditionText).toContain(label);
    });
  });

  [[1, 'Low'], [2, 'Moderate'], [3, 'High'], [4, 'Critical'], [-1, 'Clear']].forEach(([value, label]) => {
    it(`should select ${label} for current severity in query builder`, () => {
        const { conditionsContainer } = renderElement(`currentSeverityLevel = "${value}"`);

        expect(conditionsContainer?.length).toBe(1);
        const conditionText = conditionsContainer.item(0)?.textContent;
        expect(conditionText).toContain('Current severity');
        expect(conditionText).toContain('equals');
        expect(conditionText).toContain(label);
    });

    it(`should select ${label} for highest severity in query builder`, () => {
        const { conditionsContainer } = renderElement(`highestSeverityLevel = "${value}"`);

        expect(conditionsContainer?.length).toBe(1);
        const conditionText = conditionsContainer.item(0)?.textContent;
        expect(conditionText).toContain('Highest severity');
        expect(conditionText).toContain('equals');
        expect(conditionText).toContain(label);
    });
  });

  it('should select global variable option', () => {
    const globalVariableOption = { label: 'Global variable', value: '$global_variable' };
    const { conditionsContainer } = renderElement('currentSeverityLevel = \"$global_variable\"', [globalVariableOption]);

    expect(conditionsContainer?.length).toBe(1);
    const conditionText = conditionsContainer.item(0)?.textContent;
    expect(conditionText).toContain('Current severity');
    expect(conditionText).toContain('equals');
    expect(conditionText).toContain(globalVariableOption.label);
  });
});
