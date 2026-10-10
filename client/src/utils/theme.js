export function getSavedTheme() {
  try {
    const saved = localStorage.getItem('oams_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }

  // Fallback to system preference
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';

  // Primary mechanism used across dashboards
  document.documentElement.setAttribute('data-theme', next);

  // Backward-compatible: some pages toggle body.dark-mode
  if (next === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  // Single source of truth
  try {
    localStorage.setItem('oams_theme', next);
  } catch {
    // ignore
  }
}

