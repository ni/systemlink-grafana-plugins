import { checkIfNumber, enumToOptions, filterXSSField, filterXSSLINQExpression } from "./utils";

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

describe('checkIfNumber', () => {
    let mockPreventDefault: jest.Mock;
  
    beforeEach(() => {
        mockPreventDefault = jest.fn();
    });
  
    test('allows numeric keys', () => {
      const event = { key: '5', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
      
      checkIfNumber(event);

      expect(mockPreventDefault).not.toHaveBeenCalled();
    });
  
    test('allows navigation keys', () => {
        const event = { key: 'Tab', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
        
        checkIfNumber(event);

        expect(mockPreventDefault).not.toHaveBeenCalled();
    });
  
    test('prevents non-numeric keys', () => {
        const event = { key: 'a', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
        
        checkIfNumber(event);

        expect(mockPreventDefault).toHaveBeenCalled();
    });
  
    test('prevents special characters except allowed ones', () => {
        const event = { key: '@', preventDefault: mockPreventDefault } as unknown as React.KeyboardEvent<HTMLInputElement>;
        
        checkIfNumber(event);
        
        expect(mockPreventDefault).toHaveBeenCalled();
    });
});
