export default [
  { ignores: ['dist/**', 'resources/**', 'build/**'] },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-dupe-args': 'error',
      eqeqeq: 'error',
    },
  },
  {
    files: ['renderer/*.js'],
    languageOptions: { globals: { window: 'readonly', document: 'readonly' } },
  },
  {
    files: ['*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { require: 'readonly' },
    },
  },
  {
    files: ['test/e2e/*.js'],
    languageOptions: { globals: { window: 'readonly', document: 'readonly' } },
  },
];
