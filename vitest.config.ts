// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'e2e', '.worktrees'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['services/ai/contentGeneration/passes/auditChecks.ts']
    }
  }
});
