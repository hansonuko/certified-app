import type { Config } from 'tailwindcss';

// Platform-UI design tokens from docs/design-system.md §1 — the app's own tokens,
// distinct from the certificate templates' tokens in lib/certificates/. Colors are
// wired through the CSS variables declared in app/globals.css (--certified-*) so
// the same palette is available to arbitrary CSS and to Tailwind utilities alike.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'certified-ink': 'var(--certified-ink)',
        'certified-navy': 'var(--certified-navy)',
        'certified-navy-2': 'var(--certified-navy-2)',
        'certified-gold': 'var(--certified-gold)',
        'certified-gold-light': 'var(--certified-gold-light)',
        'certified-surface': 'var(--certified-surface)',
        'certified-surface-2': 'var(--certified-surface-2)',
        'certified-border': 'var(--certified-border)',
        'certified-muted': 'var(--certified-muted)',
        'certified-success': 'var(--certified-success)',
        'certified-danger': 'var(--certified-danger)',
        'certified-warning': 'var(--certified-warning)',
      },
      fontFamily: {
        // Display/serif for certificate names + marketing headlines; UI sans for
        // all interface text (docs/design-system.md §1, Typography).
        display: ['var(--font-display)', 'Georgia', '"Playfair Display"', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // The confirmed type scale: 12/14/16/20/24/32/40/56px.
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '40px',
        '4xl': '56px',
      },
      spacing: {
        // 4px base unit: 4/8/12/16/24/32/48/64px.
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        // Cards/panels 12px, buttons/inputs 8px, pills/badges full (Tailwind's
        // built-in `rounded-full` already covers that last one).
        card: '12px',
        control: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
