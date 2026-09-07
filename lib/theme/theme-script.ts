// The no-flash dark-mode bootstrap (app/layout.tsx). Runs as a blocking
// inline script in <head>, before React hydrates or the body paints, so the
// very first frame already has the right theme class — a stored choice
// wins over OS preference, and the OS preference wins over nothing at all.
// Kept as a plain string (not a React component) since it has to run via a
// literal <script> tag, not JSX. components/ThemeToggle.tsx writes the same
// localStorage key this reads.
export const THEME_STORAGE_KEY = 'certified-africa-theme';

export const themeBootstrapScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
