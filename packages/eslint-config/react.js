import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import base from './base.js';

/** React (Vite) apps: browser globals + hooks rules + fast-refresh safety. */
export default tseslint.config(
  ...base,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
);
