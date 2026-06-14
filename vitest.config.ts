import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const p = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@aishware/react-a11y-core': p('./packages/core/src/index.ts'),
      '@aishware/react-a11y-rules-web': p('./packages/rules-web/src/index.ts'),
      '@aishware/react-a11y-rules-native': p('./packages/rules-native/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
  },
});
