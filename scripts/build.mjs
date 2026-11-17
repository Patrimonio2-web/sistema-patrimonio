import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wasm = join(root, "frontend", "node_modules", "@next", "swc-wasm-nodejs");
const env = { ...process.env };

// El compilador nativo de Next falla al cargar una DLL en este Windows.
// Vercel usa Linux y conserva su compilador nativo.
if (process.platform === "win32" && existsSync(join(wasm, "wasm.js"))) {
  env.NEXT_TEST_WASM_DIR = wasm;
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["--dir", "frontend", "build"], {
  cwd: root,
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
