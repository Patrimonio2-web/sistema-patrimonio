import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend");
const localPython = join(backend, process.platform === "win32" ? "venv/Scripts/python.exe" : "venv/bin/python");
const python = existsSync(localPython) ? localPython : process.platform === "win32" ? "python" : "python3";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const wasm = join(root, "frontend", "node_modules", "@next", "swc-wasm-nodejs");
const frontendEnv = process.platform === "win32" && existsSync(join(wasm, "wasm.js"))
  ? { ...process.env, NEXT_TEST_WASM_DIR: wasm }
  : process.env;
const children = [];
let stopping = false;

function start(label, command, args, cwd, shell = false, env = process.env) {
  const child = spawn(command, args, { cwd, stdio: "inherit", shell, env });
  children.push(child);
  child.on("error", (error) => {
    console.error(`${label}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`${label} terminó con código ${code ?? "desconocido"}.`);
      stop(code || 1);
    }
  });
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && child.pid) child.kill("SIGTERM");
  }
  process.exitCode = code;
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

console.log("Backend: http://127.0.0.1:5000 | Frontend: http://localhost:3000");
start("backend", python, ["-m", "flask", "--app", "app:app", "run", "--no-reload", "--host", "127.0.0.1", "--port", "5000"], backend);
start("frontend", pnpm, ["--dir", "frontend", "dev"], root, process.platform === "win32", frontendEnv);
