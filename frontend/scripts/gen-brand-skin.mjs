// Genera src/brand-skin.css: remapea los azules/morados (y fondos grises) que
// quedan en los componentes a la paleta de marca, solo dentro de `.brand-skin`
// (dashboard del joven, panel admin y CMS). Re-ejecutar si esos componentes cambian:
//   node scripts/gen-brand-skin.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const dirs = [
  join(root, 'components'),
  join(root, 'components', 'privacy'),
  join(root, 'components', 'admin'),
  join(root, 'components', 'young'),
  join(root, 'components', 'ui'),
  join(root, 'pages'),
];
const files = dirs.flatMap(d =>
  readdirSync(d)
    .filter(f => f.endsWith('.tsx'))
    .map(f => join(d, f))
);

const FIRE = { 50: '#FFF8F1', 100: '#FDEBDD', 200: '#F6D6B8', 300: '#F4B58C', 400: '#F9A23B', 500: '#DA4C1C', 600: '#C2410F', 700: '#B3243B', 800: '#8A1C45', 900: '#4E0F3A', 950: '#2A1A22' };
const WINE = { 50: '#FBF0F3', 100: '#F6E1E8', 200: '#EBC3D2', 300: '#E08FAE', 400: '#F4A3C0', 500: '#B0245A', 600: '#8A1C45', 700: '#6E1640', 800: '#4E0F3A', 900: '#2A0A20', 950: '#1A0614' };
const GRAY_DARK = { 600: '#3A2A30', 700: '#2A1A22', 800: '#1E1218', 900: '#140B10', 950: '#0C0609' };
const GRAY_LIGHT = { 50: '#FFF8F1', 100: '#FFF4E8' };
// Grises oscuros sin `dark:` (ternarios con useTheme, p. ej. isDark ? 'bg-gray-800' : …)
const GRAY_DARK_PLAIN = { 700: '#2A1A22', 800: '#1E1218', 900: '#140B10', 950: '#0C0609' };
const PALETTES = { blue: FIRE, sky: FIRE, cyan: FIRE, indigo: WINE, purple: WINE, violet: WINE };
const PSEUDO = new Set(['hover', 'focus', 'active', 'disabled', 'focus-within', 'focus-visible']);

const pattern =
  /(?<![\w:-])((?:[a-z-]+:)*)(bg|text|border|ring|from|via|to|divide|placeholder)-(blue|sky|cyan|indigo|purple|violet|gray)-(50|100|200|300|400|500|600|700|800|900|950)(?:\/(\d+))?(?![\w-])/g;

const withAlpha = (hex, op) => {
  if (op === undefined) return hex;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${Number(op) / 100})`;
};
const escape = cls => cls.replace(/([:/.[\]])/g, '\\$1');

const rules = new Map();
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(pattern)) {
    const [, variants, prop, hue, shade, op] = m;
    const vs = variants.split(':').filter(Boolean);
    const isDark = vs.includes('dark');
    let value;
    if (hue === 'gray') {
      if (!['bg', 'border', 'divide', 'from', 'via', 'to'].includes(prop)) continue;
      const table = isDark
        ? GRAY_DARK
        : prop === 'bg' && GRAY_DARK_PLAIN[shade]
          ? GRAY_DARK_PLAIN
          : GRAY_LIGHT;
      if (!table[shade]) continue;
      value =
        (prop === 'border' || prop === 'divide') && isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : withAlpha(table[shade], op);
    } else {
      value = withAlpha(PALETTES[hue][shade], op);
    }

    const full = `${variants}${prop}-${hue}-${shade}${op ? `/${op}` : ''}`;
    // `dark` puede estar en <html> o en un contenedor dentro del skin (p. ej. el modal de ranking).
    let prefixes = ['.brand-skin '];
    let pseudo = '';
    for (const v of vs) {
      if (v === 'dark') prefixes = ['.dark .brand-skin ', '.brand-skin .dark '];
      else if (PSEUDO.has(v)) pseudo += `:${v}`;
      else if (v === 'group-hover') prefixes = prefixes.map(p => p + '.group:hover ');
    }
    const suffix =
      prop === 'placeholder'
        ? '::placeholder'
        : prop === 'divide'
          ? ' > :not([hidden]) ~ :not([hidden])'
          : '';
    const selector = prefixes
      .map(p => `${p}.${escape(full)}${pseudo}${suffix}`)
      .join(', ');

    const decl = {
      bg: `background-color: ${value};`,
      text: `color: ${value};`,
      placeholder: `color: ${value};`,
      border: `border-color: ${value};`,
      divide: `border-color: ${value};`,
      ring: `--tw-ring-color: ${value};`,
      from: `--tw-gradient-from: ${value} var(--tw-gradient-from-position);`,
      via: `--tw-gradient-stops: var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to);`,
      to: `--tw-gradient-to: ${value} var(--tw-gradient-to-position);`,
    }[prop];
    rules.set(selector, decl);
  }
}

const out = [
  '/* Generado por scripts/gen-brand-skin.mjs — no editar a mano. */',
  ...[...rules.keys()].sort().map(sel => `${sel} { ${rules.get(sel)} }`),
];
writeFileSync(join(root, 'brand-skin.css'), out.join('\n') + '\n');
console.log(`brand-skin.css: ${rules.size} reglas`);
