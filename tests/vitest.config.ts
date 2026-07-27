import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['frontend/**/*.spec.ts', 'frontend/**/*.spec.tsx', 'backend/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/src'),
      'src': path.resolve(__dirname, '../backend/src'),
    },
  },
});
