import { defineConfig, devices } from "@playwright/test";
import { requireIsolatedTestDatabase } from "./tests/helpers/test-database";

requireIsolatedTestDatabase();
const port = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  webServer: {
    command: `./node_modules/.bin/next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
