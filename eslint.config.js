// Minimal ESLint flat config focused on catching the class of bug that
// recently broke `vite build` (stray parens, dead-code blocks, undeclared
// vars). Style rules are deliberately omitted — this is a syntax/correctness
// safety net, not a formatter.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'server/node_modules/**',
      'dist/**',
      'data/**',
      'prices/**',
      'server/datacache/**',
      'docs/**',
      '**/*.min.js',
    ],
  },

  js.configs.recommended,

  // Frontend (browser + JSX)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2023 },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off', // JSX components trip this without a React plugin; keep off
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // Backend (Node) — root scripts also run under Node
  {
    files: ['server/**/*.js', 'scripts/**/*.js', '*.config.js', 'fetchNewStocks.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2023 },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // Tests (Vitest globals + browser)
  {
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2023,
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-empty': 'off',
    },
  },
];
