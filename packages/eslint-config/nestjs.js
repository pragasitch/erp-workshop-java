import globals from 'globals';
import tseslint from 'typescript-eslint';
import base from './base.js';

/** NestJS apps: Node globals + type-aware rules that catch un-awaited promises. */
export default tseslint.config(
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
