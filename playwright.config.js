// Config for the one real-browser smoke test under tests/e2e/ — see smoke.spec.js's header comment
// for why it exists alongside the much larger jsdom suite (tests/ui/, run via `npm test`/vitest,
// unaffected by this file). Run this suite with `npm run test:e2e`.
//
// First-time setup on a machine that doesn't already have a Chromium build cached (this sandbox's
// container image does, at /opt/pw-browsers — see the repo's environment notes if that's unfamiliar):
//   npx playwright install chromium
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'node tests/e2e/serve.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
