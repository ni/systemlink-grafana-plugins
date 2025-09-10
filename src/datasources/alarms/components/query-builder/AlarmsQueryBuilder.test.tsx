import React from 'react';
import { render } from '@testing-library/react';
import { AlarmsQueryBuilder } from './AlarmsQueryBuilder';
import { QueryBuilderOption } from 'core/types';
import { BOOLEAN_OPTIONS, SEVERITY_LEVELS } from 'datasources/alarms/constants/AlarmsQueryBuilder.constants';

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

  BOOLEAN_OPTIONS.forEach(({ label, value }) => {
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

  SEVERITY_LEVELS.forEach(({label, value}) => {
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

  it('should select value for alarm ID in query builder', () => {
    const { conditionsContainer } = renderElement('alarmId = "test-alarm-123"');

    expect(conditionsContainer?.length).toBe(1);
    const conditionText = conditionsContainer.item(0)?.textContent;
    expect(conditionText).toContain('Alarm ID');
    expect(conditionText).toContain('equals');
    expect(conditionText).toContain('test-alarm-123');
  });

  it('should select value for alarm name in query builder', () => {
    const { conditionsContainer } = renderElement('displayName = "Test Alarm Name"');

    expect(conditionsContainer?.length).toBe(1);
    const conditionText = conditionsContainer.item(0)?.textContent;
    expect(conditionText).toContain('Alarm name');
    expect(conditionText).toContain('equals');
    expect(conditionText).toContain('Test Alarm Name');
  });

  it('should select value for channel in query builder', () => {
    const { conditionsContainer } = renderElement('channel = "channel-001"');

    expect(conditionsContainer?.length).toBe(1);
    const conditionText = conditionsContainer.item(0)?.textContent;
    expect(conditionText).toContain('Channel');
    expect(conditionText).toContain('equals');
    expect(conditionText).toContain('channel-001');
  });

  it('should select value for created by in query builder', () => {
    const { conditionsContainer } = renderElement('createdBy = "tagRuleEngine"');

    expect(conditionsContainer?.length).toBe(1);
    const conditionText = conditionsContainer.item(0)?.textContent;
    expect(conditionText).toContain('Created by');
    expect(conditionText).toContain('equals');
    expect(conditionText).toContain('tagRuleEngine');
  });

  it('should select value for description in query builder', () => {
    const { conditionsContainer } = renderElement('description = "System overheating detected"');

    expect(conditionsContainer?.length).toBe(1);
    const conditionText = conditionsContainer.item(0)?.textContent;
    expect(conditionText).toContain('Description');
    expect(conditionText).toContain('equals');
    expect(conditionText).toContain('System overheating detected');
  });

  it('should select value for resource type in query builder', () => {
    const { conditionsContainer } = renderElement('resourceType = "Tag"');

    expect(conditionsContainer?.length).toBe(1);
    const conditionText = conditionsContainer.item(0)?.textContent;
    expect(conditionText).toContain('Resource type');
    expect(conditionText).toContain('equals');
    expect(conditionText).toContain('Tag');
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
