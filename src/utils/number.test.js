import { describe, it, expect } from 'vitest';
import { clamp } from './number';

describe('number utils', () => {
  it('clamps within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps below min', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('clamps above max', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

