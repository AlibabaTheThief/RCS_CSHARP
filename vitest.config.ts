import { defineConfig } from 'vitest/config'

// Standalone config so tests don't load the PWA build plugin. The SRS logic is
// pure, so a node environment is all we need.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
