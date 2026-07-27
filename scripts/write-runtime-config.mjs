import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const apiBaseUrl = (process.env.ADMIN_API_BASE_URL || process.env.API_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const outputPath = resolve("public/config.js");
const config = { apiBaseUrl };

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `window.__CWA_ADMIN_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);
