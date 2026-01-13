export const isValidHexColor = (val) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(String(val || '').trim());

export const normalizeHexColor = (val) => String(val || '').trim().toLowerCase();

export const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex).replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized;

  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

export const blendRgb = (a, b, t) => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t)
});

export const rgbCss = (rgb) => `${rgb.r}, ${rgb.g}, ${rgb.b}`;

