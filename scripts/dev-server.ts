import { spawn } from "node:child_process";
import { once } from "node:events";
import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalCfProject } from "./local-cf-project.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const project = await createLocalCfProject(root);
try {
  const cf = join(dirname(fileURLToPath(import.meta.resolve("cf/package.json"))), "bin/cf");
  const child = spawn(process.execPath, [cf, "dev", ...process.argv.slice(2)], {
    cwd: project,
    stdio: "inherit",
  });
  const stop = (signal: NodeJS.Signals) => child.kill(signal);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const [code, signal] = await once(child, "exit");
    process.exitCode = code ?? (signal ? 1 : 0);
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
} finally {
  await rm(project, { recursive: true, force: true });
}
