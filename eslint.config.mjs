import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
// mjs (js modules) allows direct imports instead of strings in json that eslint has to work to resolve to packages
// this is "flat config" not the old recursive tree traversal

// adding eslint security
import security from 'eslint-plugin-security';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // just know you always need a plugins key and a rules key, which you add yourself - cra generates eslint
  {
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
