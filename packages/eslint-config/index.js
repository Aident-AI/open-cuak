// TODO: migrate all mono-repo packages to extend this config

module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    semi: ['error', 'always'],
    '@typescript-eslint/semi': ['error'],
    'no-console': 1, // Means warning
    'prettier/prettier': 2, // Means error
    // "@typescript-eslint/no-floating-promises": ["error", { "ignoreVoid": true }]
  },
};
