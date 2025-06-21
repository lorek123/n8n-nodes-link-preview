const eslintPluginN8nNodesBase = require('eslint-plugin-n8n-nodes-base');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'n8n-nodes-base': eslintPluginN8nNodesBase,
    },
    rules: {
      ...eslintPluginN8nNodesBase.configs.nodes.rules,
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: require('jsonc-eslint-parser'),
    },
  },
]; 