import { areKeyValueArraysEqual } from "./utils";

describe('areKeyValueArraysEqual', () => {
  it('returns true for identical arrays', () => {
    const a = [
      { name: 'alpha', value: 1 },
      { name: 'beta', value: 'two' },
    ];
    const b = [
      { name: 'alpha', value: 1 },
      { name: 'beta', value: 'two' },
    ];
    expect(areKeyValueArraysEqual(a, b)).toBe(true);
  });

  it('returns false when lengths differ', () => {
    const a = [ { name: 'alpha', value: 1 } ];
    const b = [ { name: 'alpha', value: 1 }, { name: 'beta', value: 2 } ];
    expect(areKeyValueArraysEqual(a, b)).toBe(false);
  });

  it('returns false when any name differs', () => {
    const a = [ { name: 'alpha', value: 1 } ];
    const b = [ { name: 'ALPHA', value: 1 } ];
    expect(areKeyValueArraysEqual(a, b)).toBe(false);
  });

  it('returns false when any value differs', () => {
    const a = [ { name: 'alpha', value: 1 } ];
    const b = [ { name: 'alpha', value: 2 } ];
    expect(areKeyValueArraysEqual(a, b)).toBe(false);
  });

  it('returns false when order differs (order sensitive)', () => {
    const a = [
      { name: 'alpha', value: 1 },
      { name: 'beta', value: 2 },
    ];
    const b = [
      { name: 'beta', value: 2 },
      { name: 'alpha', value: 1 },
    ];
    expect(areKeyValueArraysEqual(a, b)).toBe(false);
  });

  it('supports custom key/value property names', () => {
    const a = [ { key: 'alpha', val: 1 }, { key: 'beta', val: 2 } ];
    const b = [ { key: 'alpha', val: 1 }, { key: 'beta', val: 2 } ];
    expect(areKeyValueArraysEqual(a, b, 'key', 'val')).toBe(true);
  });

  it('returns false if custom key/value mismatch', () => {
    const a = [ { key: 'alpha', val: 1 } ];
    const b = [ { key: 'alpha', val: 2 } ];
    expect(areKeyValueArraysEqual(a, b, 'key', 'val')).toBe(false);
  });
});
