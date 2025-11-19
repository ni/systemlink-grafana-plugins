import { areKeyValuesEqual } from "./utils";

describe('areKeyValuesEqual', () => {
  it('returns true for identical flat objects', () => {
    const a = { alpha: 1, beta: 'two' };
    const b = { alpha: 1, beta: 'two' };
    expect(areKeyValuesEqual(a, b)).toBe(true);
  });

  it('returns true when property order differs', () => {
    const a: Record<string, any> = { alpha: 1, beta: 2, gamma: 'x' };
    const b: Record<string, any> = { gamma: 'x', beta: 2, alpha: 1 };
    expect(areKeyValuesEqual(a, b)).toBe(true);
  });

  it('returns false when a key set differs (missing key)', () => {
    const a = { alpha: 1 };
    const b = { alpha: 1, beta: 2 };
    expect(areKeyValuesEqual(a, b)).toBe(false);
  });

  it('returns false when any value differs', () => {
    const a = { alpha: 1 };
    const b = { alpha: 2 };
    expect(areKeyValuesEqual(a, b)).toBe(false);
  });

  it('returns true for deep equal nested structures', () => {
    const a = { alpha: { nested: [1, 2, { z: 'ok' }] }, beta: 'two' };
    const b = { beta: 'two', alpha: { nested: [1, 2, { z: 'ok' }] } };
    expect(areKeyValuesEqual(a, b)).toBe(true);
  });

  it('returns false for deep unequal nested structures', () => {
    const a = { alpha: { nested: [1, 2, { z: 'ok' }] } };
    const b = { alpha: { nested: [1, 2, { z: 'NOPE' }] } };
    expect(areKeyValuesEqual(a, b)).toBe(false);
  });
});
