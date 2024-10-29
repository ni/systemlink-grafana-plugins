import { enumToOptions, filterXSSField, filterXSSLINQExpression } from "./utils";

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
    test('simple XSS handling', () => {
        const result = filterXSSLINQExpression('test<script>alert("XSS")</script>');

        expect(result).toEqual('test');
    });

    test('Escaped <a> attribute', () => {
        const result = filterXSSLINQExpression('test\\<a onmouseover=\'alert(document.cookie)\'\\>xxs link\\</a\\>');

        expect(result).toEqual('test\\<a>xxs link\\</a>');
    });

    test('XSS in LINQ expression', () => {
        const result = filterXSSLINQExpression('ExternalCalibration.NextRecommendedDate < \"2024-10-29T02:53:47.647Z\" && ExternalCalibration.NextRecommendedDate > \"2025-10-29T08:53:47.647Z\" && Location.MinionId = \"e2etest-1730102822793-365e021a-d0c5-496c-87f8-8e4e5fa5090f\" && ExternalCalibration.NextRecommendedDate > \"2024-10-29T08:53:43.995Z\" && ExternalCalibration.NextRecommendedDate < \"\\<a onmouseover=\'alert(document.cookie)\'\\>xxs link\\</a\\>\"');

        expect(result).toEqual('ExternalCalibration.NextRecommendedDate < \"2024-10-29T02:53:47.647Z\" && ExternalCalibration.NextRecommendedDate > \"2025-10-29T08:53:47.647Z\" && Location.MinionId = \"e2etest-1730102822793-365e021a-d0c5-496c-87f8-8e4e5fa5090f\" && ExternalCalibration.NextRecommendedDate > \"2024-10-29T08:53:43.995Z\" && ExternalCalibration.NextRecommendedDate < \"\\<a>xxs link\\\"</a>');
    });
});

describe("filterXSSField", () => {
    test('simple field sanitization', () => {
        const result = filterXSSField({ value: 'test<script>alert("XSS value")</script>', label: 'test<script>alert("XSS label")</script>' });

        expect(result).toEqual({ value: 'test', label: 'test' });
    });
});
