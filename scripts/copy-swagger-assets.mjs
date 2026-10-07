import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const swaggerRequire = createRequire(require.resolve("swagger-ui-express"));
const source = dirname(swaggerRequire.resolve("swagger-ui-dist/package.json"));
const destination = new URL("../public/docs/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const asset of [
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
  "favicon-16x16.png",
  "favicon-32x32.png",
]) {
  await copyFile(join(source, asset), new URL(asset, destination));
}
console.info("Swagger assets copied to public/docs for Vercel's CDN.");
