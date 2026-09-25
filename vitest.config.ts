import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Mirror the build-time define so tests see the same version the bundle ships.
const { version } = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  define: { __PKG_VERSION__: JSON.stringify(version) },
});
