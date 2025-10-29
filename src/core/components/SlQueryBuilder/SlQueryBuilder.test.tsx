import React from 'react';
import { render } from '@testing-library/react';
import { SlQueryBuilder } from './SlQueryBuilder';
import { QueryBuilderCustomOperation, QueryBuilderField } from 'smart-webcomponents-react';
import * as QueryBuilderModule from 'smart-webcomponents-react/querybuilder';


describe('SlQueryBuilder', () => {
  const containerClass = 'smart-filter-group-condition-container';
  const customOperations = [{
    name: '=',
    label: 'Custom operation',
    expressionTemplate: '{0} = "{1}"'
  }];
  const fields = [
    { label: 'Field2', dataField: 'field2', filterOperations: ['='] },
    { label: 'Field1', dataField: 'field1', filterOperations: ['='] },
    { label: 'Field4', dataField: 'field4', filterOperations: ['='] },
    { label: 'Field3', dataField: 'field3', filterOperations: ['='] }
  ];

  function renderElement(
    customOperations: QueryBuilderCustomOperation[] = [],
    fields: QueryBuilderField[] = [],
    messages: any = {},
    value = '',
    onChange = jest.fn()
  ) {
    const reactNode = React.createElement(SlQueryBuilder, { value, customOperations, fields, messages, onChange });
    const renderResult = render(reactNode);

    return {
      renderResult,
      conditionsContainer: renderResult.container.getElementsByClassName(`${containerClass}`),
    };
  }

  it('should render empty query builder', () => {
    const { renderResult, conditionsContainer } = renderElement();

    expect(conditionsContainer.length).toBe(1);
    expect(renderResult.findByLabelText('Empty condition row')).toBeTruthy();
  });

  it('should sanitize fields in query builder', () => {
    const { conditionsContainer } = renderElement(customOperations, fields, {}, 'field1 = "<script>alert(\'Test\')</script>"');

    expect(conditionsContainer?.length).toBe(1);
    expect(conditionsContainer.item(0)?.innerHTML).not.toContain('alert(\'Test\')');
  });

  it('should sort fields in query builder', () => {
    const queryBuilderSpy = jest.spyOn(QueryBuilderModule, "default").mockImplementation(jest.fn());
    const expectedFieldLabels = ['Field1', 'Field2', 'Field3', 'Field4'];

    renderElement(customOperations, fields);
    const queryBuilderFields = queryBuilderSpy.mock.lastCall?.at(0).fields;
    const queryBuilderFieldLabels = queryBuilderFields?.map((field: QueryBuilderField) => field.label);

    expect(queryBuilderFieldLabels).toEqual(expectedFieldLabels);
  });

  it('should pass disabled prop to QueryBuilder', () => {
    const queryBuilderSpy = jest.spyOn(QueryBuilderModule, "default").mockImplementation(jest.fn());
    
    const reactNode = React.createElement(SlQueryBuilder, { 
      value: '', 
      customOperations, 
      fields, 
      messages: {}, 
      onChange: jest.fn(),
      disabled: true 
    });
    render(reactNode);

    const queryBuilderProps = queryBuilderSpy.mock.lastCall?.at(0);
    expect(queryBuilderProps?.disabled).toBe(true);
  });

  it('should default disabled to false when not provided', () => {
    const queryBuilderSpy = jest.spyOn(QueryBuilderModule, "default").mockImplementation(jest.fn());
    
    renderElement(customOperations, fields);

    const queryBuilderProps = queryBuilderSpy.mock.lastCall?.at(0);
    expect(queryBuilderProps?.disabled).toBe(false);
  });

  it('should default fieldsMode to static', () => {
    const queryBuilderSpy = jest.spyOn(QueryBuilderModule, "default").mockImplementation(jest.fn());
    
    renderElement(customOperations, fields);

    const queryBuilderProps = queryBuilderSpy.mock.lastCall?.at(0);
    expect(queryBuilderProps?.fieldsMode).toBe('static');
  });
});
