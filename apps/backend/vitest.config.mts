import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/__tests__/**/*.test.ts'], fileParallelism: false, testTimeout: 90000, hookTimeout: 90000, setupFiles: ['src/__tests__/setup.ts'] } });
