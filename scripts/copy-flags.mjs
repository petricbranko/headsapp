// Copies country flag SVGs (country-flag-icons, MIT) into public/flags so they load lazily as images.
import { cpSync, existsSync, mkdirSync } from "node:fs";
const src = "node_modules/country-flag-icons/3x2";
const dest = "public/flags";
if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}
