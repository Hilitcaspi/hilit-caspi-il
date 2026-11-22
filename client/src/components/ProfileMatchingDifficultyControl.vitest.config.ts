import { defineConfig } from "vitest/config";
import path from "node:path";

// The shared project config discovers only server tests. Run this synthetic UI
// suite with: pnpm exec vitest run --config client/src/components/ProfileMatchingDifficultyControl.vitest.config.ts
const root = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root,
  resolve: {
    alias: {
      "@": path.join(root, "client/src"),
      "@shared": path.join(root, "shared"),
    },
  },
  test: {
    environment: "node",
    include: ["client/src/components/ProfileMatchingDifficultyControl.test.ts"],
  },
});
