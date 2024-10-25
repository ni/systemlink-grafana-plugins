import { enumToOptions, filterXSSField, filterXSSValue } from "./utils";

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


test('filterXSS', () => {
    const result = filterXSSValue('<script>alert("XSS")</script>');

    expect(result).toEqual('&lt;script&gt;alert("XSS")&lt;/script&gt;');
})

test('filterXSSField', () => {
    const result = filterXSSField({ value: '<script>alert("XSS value")</script>', label: '<script>alert("XSS label")</script>'});

    expect(result).toEqual({ value: '&lt;script&gt;alert("XSS value")&lt;/script&gt;', label: '&lt;script&gt;alert("XSS label")&lt;/script&gt;'});
})
