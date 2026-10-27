import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  timeout: 10 * 60 * 1000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1500, height: 940 },
    trace: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    video: 'off',
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
