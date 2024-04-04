import { enumToOptions, expandMultipleValueVariableAfterReplace } from "./utils";

test('enumToOptions', () => {
  enum fakeStringEnum {
    Label1 = 'Value1',
    Label2 = 'Value2'
  }

  const result = enumToOptions(fakeStringEnum);

  expect(result).toEqual([
    { label: 'Label1', value: 'Value1' },
    { label: 'Label2', value: 'Value2' }
  ]);
});

describe('expandMultipleValueVariableAfterReplace', () => {
  test('basicString', () => {
    expect(expandMultipleValueVariableAfterReplace('a{{b,c,d}}e')).toEqual(['abe', 'ace', 'ade']);
  })

  test('doublePatternString', () => {
    expect(expandMultipleValueVariableAfterReplace('{{a,b}}-{{c,d}}')).toEqual(['a-c', 'a-d', 'b-c', 'b-d']);
  })
  test('doublePatternWithoutSeparatorString', () => {
    expect(expandMultipleValueVariableAfterReplace('{{a,b}}{{c,d}}')).toEqual(['ac', 'ad', 'bc', 'bd']);
  })
  test('plainString', () => {
    expect(expandMultipleValueVariableAfterReplace('plainString')).toEqual(['plainString']);
  })
  test('ignoreEmptyElementsInBracesString', () => {
    expect(expandMultipleValueVariableAfterReplace('a{{b,c,,d,e,,f,}}g')).toEqual(['abg', 'acg', 'adg', 'aeg', 'afg']);
  })
  test('nestedString', () => {
    expect(() => {
      expandMultipleValueVariableAfterReplace('a{{b,{{c}}},e')
    }).toThrow('Nested braces are not allowed');
  })
  test('unmatchedBracesString', () => {
    expect(() => {
      expandMultipleValueVariableAfterReplace('error{{test')
    }).toThrow('Unmatched braces');
  })
})
