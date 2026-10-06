# Firefox source review

Jelly Party 2.3 is built entirely from the checked-in TypeScript and Svelte sources with Vite+.

1. Enter the repository Nix environment with `direnv allow`.
2. Install the locked workspace with `vp install --frozen-lockfile`.
3. Build both browser targets from `packages/jelly-party-extension`:

   ```bash
   vp build --mode production
   vp build --mode firefox
   ```

4. Return to the source root and run `vp exec node scripts/package-extension.mjs`.

The Firefox extension is `artifacts/jelly-party-2.3.0-firefox.zip`. The build task validates the
manifest and uses a fixed timestamp, sorted paths, and fixed compression settings so repeated builds
from the same source produce the same bytes.

Public service, website, repository, and store URLs are resolved from the validated defaults in
`config/urls.ts`. They can be overridden with the build variables documented in `.env.example`.

The packaging step rejects localhost origins, insecure production WebSocket endpoints, external
scripts/stylesheets/resources, dynamic remote imports, `eval`, and `new Function` in the built
extension. All executable extension assets are bundled in the submitted archive; network access is
limited to application data sent to `wss://meet.jelly-party.com`, required access to
`https://join.jelly-party.com`, and optional access to a user-selected video page. Packaging also
checks these endpoints against the production routes in `config/production-routes.ts`.
