import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    actionTimeout: 15000,
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    permissions: ["clipboard-read", "clipboard-write"],
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
