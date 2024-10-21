import { expandMultipleValueVariable } from "./utils";

describe('expandMultipleValueVariable', () => {
    it('checks that tags paths can be parsed without curly braces', async () => {
        const result = expandMultipleValueVariable('a.b.c');

        expect(result).toEqual(['a.b.c']);
    });

    it('checks that tags paths can be parsed with single curly braces', async () => {
        const result = expandMultipleValueVariable('a.b.c.{1,2,3}');

        expect(result).toEqual(['a.b.c.1', 'a.b.c.2', 'a.b.c.3']);
    });

    it('checks that tags paths can be parsed with multiple curly braces', async () => {
        const result = expandMultipleValueVariable('a.{x,y}.b.{1,2}');

        expect(result).toEqual(['a.x.b.1', 'a.x.b.2', 'a.y.b.1', 'a.y.b.2']);
    });

    it('checks that tags paths cannot have nested brackets', async () => {
        expect(() => expandMultipleValueVariable('a.{x,y,{1,2}}')).toThrow('Nested curly brackets are not supported');
    });

    it('checks that tags paths cannot have unmatched opening brackets', async () => {
        expect(() => expandMultipleValueVariable('a.{x,y')).toThrow('Unmatched opening curly bracket');
    });

    it('checks that tags paths cannot have unmatched closing brackets', async () => {
        expect(() => expandMultipleValueVariable('a.x,y}')).toThrow('Unmatched closing curly bracket');
    });
});
