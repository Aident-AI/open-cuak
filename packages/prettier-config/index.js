module.exports = {
  trailingComma: 'all',
  overrides: [
    {
      files: '*.json',
      options: { trailingComma: 'none' },
    },
  ],
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  printWidth: 120,
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],
};
