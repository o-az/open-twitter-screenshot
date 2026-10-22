import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: [
    'oxc',
    'node',
    'jsdoc',
    'import',
    'eslint',
    'vitest',
    'unicorn',
    'promise',
    'typescript'
  ],
  options: {
    typeCheck: true,
    typeAware: true,
    reportUnusedDisableDirectives: 'warn'
  },
  env: {
    node: true,
    es2024: true,
    browser: true,
    'shared-node-browser': true
  },
  rules: {
    'sort-keys': 'off',
    'import/extensions': [
      'error',
      'always',
      {
        ignorePackages: true,
        checkTypeImports: true
      }
    ]
  },
  overrides: [
    {
      files: ['test/**', '**/**.test.ts', '**/**.test.tsx'],
      rules: {
        'typescript/unbound-method': 'off'
      }
    }
  ],
  ignorePatterns: [
    '**/_/**',
    '.agents',
    '**/dist/**',
    '**/node_modules/**',
    'worker-configuration.d.ts'
  ]
})
