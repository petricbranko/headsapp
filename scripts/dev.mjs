#!/usr/bin/env node
// One command for local dev: starts MongoDB in Docker, then Next.js with hot reload.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";

/** true if something already accepts connections on the port */
function busy(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host: "127.0.0.1", port, timeout: 400 });
    sock.once("connect", () => { sock.destroy(); resolve(true); });
    sock.once("timeout", () => { sock.destroy(); resolve(false); });
    sock.once("error", () => resolve(false));
  });
}

async function freePort(preferred, explicit, label) {
  let p = Number(preferred);
  if (explicit) return String(p);
  for (let i = 0; i < 50; i++, p++) if (!(await busy(p))) return String(p);
  console.error(`No free port found for ${label}`);
  process.exit(1);
}

function loadEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const fileEnv = { ...loadEnv(".env.development"), ...loadEnv(".env.local") };
const env = { ...fileEnv, ...process.env };
// Respect explicit ports; otherwise start from the preferred port and skip ones in use.
const port = await freePort(env.PORT || "3000", Boolean(process.env.PORT), "the app");
const mongoRunning = spawnSync("docker", ["compose", "-f", "docker-compose.dev.yml", "port", "mongo", "27017"], { encoding: "utf8" });
const existingMongo = mongoRunning.status === 0 ? mongoRunning.stdout.trim().split(":").pop() : "";
const mongoPort = existingMongo || (await freePort(env.MONGO_PORT || "27017", Boolean(process.env.MONGO_PORT), "MongoDB"));

if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
  console.error("\n  Docker isn't running. Start Docker Desktop and try again.\n");
  process.exit(1);
}

console.log(`\n  Starting MongoDB on 127.0.0.1:${mongoPort}…`);
const up = spawnSync("docker", ["compose", "-f", "docker-compose.dev.yml", "up", "-d", "--wait"], {
  stdio: "inherit",
  env: { ...process.env, MONGO_PORT: mongoPort },
});
if (up.status !== 0) process.exit(up.status ?? 1);

console.log(`\n  HeadsApp → http://localhost:${port}\n`);
const next = spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", env: { ...process.env, PORT: port, MONGO_PORT: mongoPort } });
const stop = () => next.kill("SIGINT");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", (code) => process.exit(code ?? 0));
