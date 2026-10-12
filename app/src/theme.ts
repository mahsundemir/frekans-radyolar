export const colors = {
  bg: '#15131C',
  surface: '#1D1A26',
  surface2: '#221F2C',
  surface3: '#2B2836',
  line: 'rgba(255,255,255,0.07)',
  text: '#F4F2FA',
  muted: '#A29EB5',
  ink: '#17141F',
  white: '#FFFFFF',
};

export const display = {fontWeight: '800' as const, letterSpacing: -1};

// Zemin rengine göre okunaklı yazı rengi
export function inkFor(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.2 ? colors.ink : colors.white;
}

export function chipFor(ink: string): string {
  return ink === colors.white ? 'rgba(255,255,255,0.22)' : 'rgba(23,20,31,0.13)';
}
