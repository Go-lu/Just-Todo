import { describe, it, expect } from 'vitest';
import { isValidHexColor, normalizeHexColor, hexToRgb, blendRgb, rgbCss } from './color';

describe('color utils', () => {
  it('validates hex colors', () => {
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('#ffffff')).toBe(true);
    expect(isValidHexColor('#FFFFff')).toBe(true);
    expect(isValidHexColor('fff')).toBe(false);
    expect(isValidHexColor('#ffff')).toBe(false);
    expect(isValidHexColor('#fffffff')).toBe(false);
    expect(isValidHexColor('#gggggg')).toBe(false);
  });

  it('normalizes hex colors', () => {
    expect(normalizeHexColor('  #FFaa00  ')).toBe('#ffaa00');
  });

  it('converts hex to rgb', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#1f1f1f')).toEqual({ r: 31, g: 31, b: 31 });
  });

  it('blends rgb values', () => {
    expect(blendRgb({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0)).toEqual({ r: 0, g: 0, b: 0 });
    expect(blendRgb({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 1)).toEqual({ r: 255, g: 255, b: 255 });
    expect(blendRgb({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0.5)).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('formats rgb for css', () => {
    expect(rgbCss({ r: 1, g: 2, b: 3 })).toBe('1, 2, 3');
  });
});

