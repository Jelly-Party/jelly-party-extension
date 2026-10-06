import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { createLocalCfProject } from "./local-cf-project.ts";

test("separate cf launches share existing state without replacing package-local data", async () => {
  const root = await mkdtemp(join(tmpdir(), "jelly-party-dev-test-"));
  const projects: string[] = [];
  try {
    await mkdir(join(root, "node_modules"));
    await mkdir(join(root, ".wrangler/state"), { recursive: true });
    await mkdir(join(root, "packages/jelly-party-server/.wrangler/state"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ devDependencies: { cf: "1.0.0-beta.12", wrangler: "4.147.0" } }),
    );
    await writeFile(join(root, ".wrangler/state/existing"), "existing state");
    await writeFile(join(root, "packages/jelly-party-server/.wrangler/state/other"), "other state");
    await writeFile(join(root, ".dev.vars"), "LOCAL_TEST_VALUE=local-only\n");
    projects.push(await createLocalCfProject(root), await createLocalCfProject(root));
    expect(projects[0]).not.toBe(projects[1]);
    expect(await realpath(join(projects[0]!, ".wrangler/state"))).toBe(
      join(root, ".wrangler/state"),
    );
    await writeFile(join(projects[0]!, ".wrangler/state/new"), "new state");
    expect(await readFile(join(projects[1]!, ".wrangler/state/new"), "utf8")).toBe("new state");
    expect(await readFile(join(root, ".wrangler/state/existing"), "utf8")).toBe("existing state");
    expect(
      await readFile(join(root, "packages/jelly-party-server/.wrangler/state/other"), "utf8"),
    ).toBe("other state");
    expect(await realpath(join(projects[0]!, ".dev.vars"))).toBe(join(root, ".dev.vars"));
    await rm(projects[0]!, { recursive: true, force: true });
    expect(await readFile(join(root, ".wrangler/state/new"), "utf8")).toBe("new state");
  } finally {
    await Promise.all(projects.map((project) => rm(project, { recursive: true, force: true })));
    await rm(root, { recursive: true, force: true });
  }
});
