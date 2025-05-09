import { TemplateSrv } from "@grafana/runtime";
import { validateNumericInput, enumToOptions, filterXSSField, filterXSSLINQExpression, replaceVariables } from "./utils";

test('enumToOptions', () => {
    enum fakeStringEnum {
        Label1 = 'Value1',
        Label2 = 'Value2'
    };

    const result = enumToOptions(fakeStringEnum);

    expect(result).toEqual([
        { label: 'Label1', value: 'Value1' },
        { label: 'Label2', value: 'Value2' }
    ]);
});

describe("filterXSSLINQExpression", () => {
    test('Sanitize simple XSS', () => {
        const result = filterXSSLINQExpression('test<script>alert("XSS")</script>');

        expect(result).toEqual('test');
    });

    test('Sanitize escaped <a> attribute', () => {
        const result = filterXSSLINQExpression('test\\<a onmouseover=\'alert(document.cookie)\'\\>xxs link\\</a\\>');

        expect(result).toEqual('test\\<a>xxs link\\</a>');
    });

    test('Sanitize XSS in LINQ expression', () => {
        const result = filterXSSLINQExpression('ExternalCalibration.NextRecommendedDate < \"2024-10-29T02:53:47.647Z\" && ExternalCalibration.NextRecommendedDate > \"2025-10-29T08:53:47.647Z\" && Location.MinionId = \"e2etest-1730102822793-365e021a-d0c5-496c-87f8-8e4e5fa5090f\" && ExternalCalibration.NextRecommendedDate > \"2024-10-29T08:53:43.995Z\" && ExternalCalibration.NextRecommendedDate < \"\\<a onmouseover=\'alert(document.cookie)\'\\>xxs link\\</a\\>\"');

        expect(result).toEqual('ExternalCalibration.NextRecommendedDate < \"2024-10-29T02:53:47.647Z\" && ExternalCalibration.NextRecommendedDate > \"2025-10-29T08:53:47.647Z\" && Location.MinionId = \"e2etest-1730102822793-365e021a-d0c5-496c-87f8-8e4e5fa5090f\" && ExternalCalibration.NextRecommendedDate > \"2024-10-29T08:53:43.995Z\" && ExternalCalibration.NextRecommendedDate < \"\\<a>xxs link\\\"</a>');
    });

    test('LINQ Sanitization test conditions', () => {
        const result = filterXSSLINQExpression('(Example.Field <> \"EXAMPLE_VALUE_1\") && Example.Field < \"EXAMPLE_VALUE_2\" && Example.Field > \"EXAMPLE_VALUE_3\" && Example.Field <= \"EXAMPLE_VALUE_4\" && Example.Field >= \"EXAMPLE_VALUE_5\" && Example.Field != \"EXAMPLE_VALUE_6\"');

        expect(result).toEqual('(Example.Field <> \"EXAMPLE_VALUE_1\") && Example.Field < \"EXAMPLE_VALUE_2\" && Example.Field > \"EXAMPLE_VALUE_3\" && Example.Field <= \"EXAMPLE_VALUE_4\" && Example.Field >= \"EXAMPLE_VALUE_5\" && Example.Field != \"EXAMPLE_VALUE_6\"');
    });
});

describe("filterXSSField", () => {
    test('simple field sanitization', () => {
        const result = filterXSSField({ value: 'test<script>alert("XSS value")</script>', label: 'test<script>alert("XSS label")</script>' });

        expect(result).toEqual({ value: 'test', label: 'test' });
    });
});

describe('validateNumericInput', () => {
    let mockPreventDefault: jest.Mock;
  
    beforeEach(() => {
        mockPreventDefault = jest.fn();
    });
  
    test('allows numeric keys', () => {
      const event = { key: '5', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
      
      validateNumericInput(event);

      expect(mockPreventDefault).not.toHaveBeenCalled();
    });
  
    test('allows navigation keys', () => {
        const event = { key: 'Tab', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
        
        validateNumericInput(event);

        expect(mockPreventDefault).not.toHaveBeenCalled();
    });
  
    test('prevents non-numeric keys', () => {
        const event = { key: 'a', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
        
        validateNumericInput(event);

        expect(mockPreventDefault).toHaveBeenCalled();
    });
  
    test('prevents invalid special characters', () => {
        const event = { key: '@', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
        
        validateNumericInput(event);
        
        expect(mockPreventDefault).toHaveBeenCalled();
    });
});

describe('replaceVariables', () => {
  let mockTemplateSrv: TemplateSrv;

  beforeEach(() => {
    mockTemplateSrv = {
      containsTemplate: jest.fn(),
      replace: jest.fn(),
    } as unknown as TemplateSrv;
  });

  test('should replace variables when multi-value variables are selected', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn().mockReturnValue('{value1,value2}');

    const result = replaceVariables(['$var1'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2']);
  });

  test('should replace variables when single value variable is selected', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn().mockReturnValue('value1');

    const result = replaceVariables(['$var1'], mockTemplateSrv);

    expect(result).toEqual(['value1']);
  });

  test('should replace variables when multiple variables are selected', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn((variable: string) => ({
        '$var1': '{value1,value2}',
        '$var2': '{value3,value4}',
        '$var3': 'value5',
    }[variable] || variable));

    const result = replaceVariables(['$var1', '$var2', '$var3'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2', 'value3', 'value4', 'value5']);
  })

  test('should return original values when no variables are found', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(false);

    const result = replaceVariables(['value1', 'value2'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2']);
  });

  test('should deduplicate and flatten the replaced values', () => {
    mockTemplateSrv.containsTemplate = jest.fn().mockReturnValue(true);
    mockTemplateSrv.replace = jest.fn((variable: string) => ({
        '$var1': '{value1,value2}',
        '$var2': '{value2,value3}',
        '$var3': 'value3',
    }[variable] || variable));
    const result = replaceVariables(['$var1', '$var2', '$var3'], mockTemplateSrv);

    expect(result).toEqual(['value1', 'value2', 'value3']);
  });
});
