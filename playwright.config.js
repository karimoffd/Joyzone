import { defineConfig, devices } from "@playwright/test";

const frontendUrl = "http://127.0.0.1:4173";
const backendUrl = "http://127.0.0.1:8010";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node scripts/e2e-backend.mjs",
      url: `${backendUrl}/api/places/`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: "",
        DEBUG: "true",
        DEV_OTP_ENABLED: "true",
        PUBLIC_DEMO_LOGIN_ENABLED: "true",
        PUBLIC_DEMO_DATA_ISOLATED: "true",
        ALLOWED_HOSTS: "127.0.0.1,localhost",
        CORS_ALLOWED_ORIGINS: frontendUrl,
        SQLITE_PATH: ".e2e/db.sqlite3",
        MEDIA_ROOT: ".e2e/media",
      },
    },
    {
      command: "npx vite --host 127.0.0.1 --port 4173",
      url: frontendUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VITE_API_BASE_URL: backendUrl,
        VITE_API_TIMEOUT_MS: "2000",
        VITE_API_UPLOAD_TIMEOUT_MS: "5000",
        VITE_API_REFRESH_TIMEOUT_MS: "250",
      },
    },
  ],
});
