/** Converts #RRGGBB to Tailwind/shadcn HSL space-separated: "H S% L%" */
export function hexToHslSpaceSeparated(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return '351 100% 31%';
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export interface BrandColors {
  brandColorStart: string;
  brandColorMid: string;
  brandColorEnd: string;
}

/** Applies dynamic brand colors to :root via globals.css variables only. */
export function applyBrandColorsToDocument(colors: BrandColors) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { brandColorStart, brandColorMid, brandColorEnd } = colors;

  root.style.setProperty('--brand-hex-start', brandColorStart);
  root.style.setProperty('--brand-hex-mid', brandColorMid);
  root.style.setProperty('--brand-hex-end', brandColorEnd);

  root.style.setProperty('--brand-start', hexToHslSpaceSeparated(brandColorStart));
  root.style.setProperty('--brand-mid', hexToHslSpaceSeparated(brandColorMid));
  root.style.setProperty('--brand-end', hexToHslSpaceSeparated(brandColorEnd));
}
