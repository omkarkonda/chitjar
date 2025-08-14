module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es6: true
  },
  extends: ['eslint:recommended'],
  overrides: [
    {
      files: ['src/test/**/*.ts'],
      env: {
        jest: true
      },
      plugins: ['jest']
    }
  ],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  ignorePatterns: ['dist/', 'node_modules/']
};