import type { Config } from 'tailwindcss';

// Platform-UI design tokens from docs/design-system.md §1 — the app's own tokens,
// distinct from the certificate templates' tokens in lib/certificates/. Colors are
// wired through the CSS variables declared in app/globals.css (--certified-*) so
// the same palette is available to arbitrary CSS and to Tailwind utilities alike.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  // Class-based (docs/design-system.md's dark-mode addendum, ThemeToggle):
  // toggled by adding/removing `dark` on <html> (app/layout.tsx's inline
  // bootstrap script + components/ThemeToggle.tsx), not just OS preference.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // rgb(var(--x) / <alpha-value>) rather than a bare var(--x) reference
        // -- this is what lets Tailwind actually generate opacity-modified
        // utilities (bg-certified-success/10, bg-certified-surface/60, etc.).
        // The bare-var form silently produced no rule at all for any `/NN`
        // variant (confirmed against the compiled CSS while building dark
        // mode) -- every existing status-badge tint across the dashboard,
        // directory, and verification pages that used one of those was
        // quietly rendering with no background color at all until this fix.
        // app/globals.css's --certified-* values are RGB channel triplets
        // ("15 23 42", not "#0f172a") to match.
        'certified-ink': 'rgb(var(--certified-ink) / <alpha-value>)',
        'certified-navy': 'rgb(var(--certified-navy) / <alpha-value>)',
        'certified-navy-2': 'rgb(var(--certified-navy-2) / <alpha-value>)',
        'certified-gold': 'rgb(var(--certified-gold) / <alpha-value>)',
        'certified-gold-light': 'rgb(var(--certified-gold-light) / <alpha-value>)',
        'certified-surface': 'rgb(var(--certified-surface) / <alpha-value>)',
        'certified-surface-2': 'rgb(var(--certified-surface-2) / <alpha-value>)',
        'certified-border': 'rgb(var(--certified-border) / <alpha-value>)',
        'certified-muted': 'rgb(var(--certified-muted) / <alpha-value>)',
        'certified-success': 'rgb(var(--certified-success) / <alpha-value>)',
        'certified-danger': 'rgb(var(--certified-danger) / <alpha-value>)',
        'certified-warning': 'rgb(var(--certified-warning) / <alpha-value>)',
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
