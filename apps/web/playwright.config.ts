import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    navigationTimeout: 30000
  },
  webServer: {
    command: "npm run start -- --port 3000",
    port: 3000,
    reuseExistingServer: false
  }
})
