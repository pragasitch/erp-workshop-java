import react from '@erp/eslint-config/react';

export default [
  ...react,
  {
    // shadcn/ui components export their variant helpers next to the component.
    files: ['src/components/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
];
