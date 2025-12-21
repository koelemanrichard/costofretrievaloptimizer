/**
 * ESLint Configuration
 *
 * Features:
 * - TypeScript support
 * - Import ordering enforcement
 * - React support
 *
 * Created: 2024-12-20 - Coding standards enforcement
 */

import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.next/**',
      'supabase/functions/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import': importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // Import ordering rules
      'import/order': ['warn', {
        'groups': [
          'builtin',      // Node.js built-in modules (fs, path, etc.)
          'external',     // npm packages
          'internal',     // Internal modules (aliases)
          'parent',       // Parent directory imports (../)
          'sibling',      // Same directory imports (./)
          'index',        // Index file imports
          'type',         // TypeScript type imports
        ],
        'newlines-between': 'always',
        'alphabetize': {
          order: 'asc',
          caseInsensitive: true,
        },
        'pathGroups': [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
          {
            pattern: 'react-dom',
            group: 'builtin',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
            position: 'before',
          },
        ],
        'pathGroupsExcludedImportTypes': ['react', 'react-dom'],
      }],

      // Prevent deep imports that bypass barrel exports
      'no-restricted-imports': ['warn', {
        patterns: [
          // Block direct imports to AI pass implementations
          {
            group: ['services/ai/**/passes/*'],
            message: 'Import from services/ai/ barrel exports instead of direct file access.',
          },
          // Block direct imports to schema generation internals
          {
            group: ['services/ai/**/schemaGeneration/*'],
            message: 'Import from services/ai/ barrel exports instead of direct file access.',
          },
        ],
      }],

      // Import best practices
      'import/no-duplicates': 'warn',
      'import/first': 'warn',
      'import/newline-after-import': 'warn',

      // TypeScript specific
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
];
