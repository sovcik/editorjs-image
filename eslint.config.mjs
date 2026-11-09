import Codex from "eslint-config-codex";
import { plugin as TsPlugin, parser as TsParser } from 'typescript-eslint';

export default [
  ...Codex,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: TsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: './',
        sourceType: 'module',
      },
    },
    rules: {
      '@stylistic/padding-line-between-statements': 'off',
      '@stylistic/arrow-parens': 'off',
      '@stylistic/object-property-newline': 'off',
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/comma-dangle': 'off',
      'n/no-missing-import': ['off'],
      'n/no-unsupported-features/node-builtins': ['off'],
      'jsdoc/require-returns-description': ['off'],
      'jsdoc/require-jsdoc': ['off'],
      'jsdoc/require-param-description': ['off'],
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "variable",
          "format": ["camelCase"],
          "leadingUnderscore": "allow"
        },
      ],
      "@typescript-eslint/ban-types": ["error",
        {
          "types": {
            "String": true,
            "Boolean": true,
            "Number": true,
            "Symbol": true,
            "{}": false,
            "Object": true,
            "object": false,
            "Function": false,
          },
          "extendDefaults": true
        }
      ]
    }
  },
  {
    ignores: ['dev/**', 'eslint.config.mjs', 'vite.config.js', 'postcss.config.js']
  }
];
