import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["**/node_modules/**", "backend/**/*", "**/dist/**/*"]
  }
});
