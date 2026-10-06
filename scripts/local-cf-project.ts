import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Give cf its own package root while preserving the established local state. */
export async function createLocalCfProject(root: string): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), "jelly-party-dev-"));
  try {
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    const server = join(root, "packages/jelly-party-server");
    const state = join(root, ".wrangler/state");
    await mkdir(state, { recursive: true });
    await mkdir(join(project, ".wrangler"));
    await symlink(state, join(project, ".wrangler/state"), "dir");
    await symlink(join(root, "node_modules"), join(project, "node_modules"), "dir");
    for (const name of await readdir(root)) {
      if (name === ".dev.vars" || name.startsWith(".dev.vars.")) {
        await symlink(join(root, name), join(project, name));
      }
    }
    await writeFile(
      join(project, "package.json"),
      JSON.stringify({
        name: "jelly-party-local-dev",
        private: true,
        type: "module",
        devDependencies: {
          cf: manifest.devDependencies.cf,
          wrangler: manifest.devDependencies.wrangler,
        },
      }),
    );
    await writeFile(
      join(project, "cloudflare.config.ts"),
      `export { default } from ${JSON.stringify(join(server, "cloudflare.config.ts"))};\n`,
    );
    await writeFile(
      join(project, "wrangler.config.ts"),
      `import config from ${JSON.stringify(join(server, "wrangler.config.ts"))};\n` +
        `export default { ...config, assetsDirectory: ${JSON.stringify(join(root, "packages/jelly-party-website/build"))} };\n`,
    );
    return project;
  } catch (error) {
    await rm(project, { recursive: true, force: true });
    throw error;
  }
}
