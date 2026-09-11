# Jelly Party

Watch videos with friends, in sync.

Jelly Party is a browser extension and small Cloudflare Durable Object relay. Open the sidebar on a video, create a party, share the magic link, and chat while play, pause, and seek stay synchronized. There are no accounts; parties are private through their long, unguessable invite links.

## Product

- Chrome, Firefox, and Edge extension published over the existing store listings
- Native browser sidebar/side-panel UI
- Display name plus emoji—no avatars
- Magic-link joining with optional per-site permissions
- Ephemeral peer list and up to 1,000 party-history entries, cleared after 30 inactive days
- Bidirectional HTML video play, pause, and seek synchronization
- New protocol and backend at `wss://meet.jelly-party.com`; no old-client compatibility

The implementation contract is the [Jelly Party 2.0 specification](.scratch/jelly-party/spec.md).

## Repository

| Package                 | Responsibility                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `jelly-party-extension` | Shared sidebar UI, browser adapters, and small page video driver |
| `jelly-party-server`    | Cloudflare Worker and one Durable Object per party               |
| `jelly-party-lib`       | Shared validated protocol and small cross-package utilities      |
| `jelly-party-website`   | Website, `/join` handoff, support, and privacy pages             |

The extension background process owns the party connection and presence so closing or navigating away from the sidebar does not leave the party. A small content script runs in relevant frames to discover and control an HTML video. The components communicate through extension runtime messages. A party-scoped Durable Object validates and relays messages, keeps its latest 1,000 history entries, and clears all party data 30 days after its final peer disconnects. Rejoining before then restarts that countdown.

## Development

The Nix development shell is configured to activate through nix-direnv after a one-time approval and provides the Playwright browsers. [Vite+](https://viteplus.dev/) manages Node.js, pnpm, formatting, linting, tests, builds, and project tasks through the `vp` CLI.

```bash
# Approve the shell once after cloning, then install dependencies
direnv allow
vp install

# Start the local Worker and website, then open temporary Chrome and Firefox profiles
vp run dev

# Explore project tasks
vp run
```

`vp run dev` installs the extension into disposable Chrome and Firefox profiles, opens both at the
[Blender test video](https://video.blender.org/w/dmhvQNzwBnrWy1iYzVv5g7), and reloads the extension
when source files change. Development uses the same optional per-site permissions as store builds.
Stopping and restarting the command creates clean profiles, which resets those permissions and lets
the grant flow be tested repeatedly. Development targets the local website and `/join` route on port
5180 and the local Worker on port 8080. The website listens on all interfaces, so a Lima guest can be
reached from macOS through the VM's forwarded port.

Cross-package workflows belong in Vite Task and are listed by `vp run`.

Before submitting a release to the extension stores, run:

```bash
vp run stage
```

This is the final release rehearsal: it runs the complete local validation suite, builds and
validates the exact production archives, verifies the deployed website, join route, release version,
party creation, and secure WebSocket handshake, then loads those immutable production builds into
fresh temporary Chrome and Firefox profiles. It neither deploys nor hot-reloads. Close both browsers
to finish the task.

## Build configuration

All public endpoints and project/store links have validated production defaults in `config/urls.ts`.
Every value can be overridden at build time with the corresponding variable shown in `.env.example`.
These values are baked into the website and store archives. `vp run build` leaves the complete
production output together in `artifacts`: unpacked `chrome` and `firefox` directories for manual
testing, plus validated deterministic ZIPs for store submission. Building does not publish an
extension or deploy a Worker or site; those remain explicit manual operations.

Production builds require HTTPS URLs and a WSS relay. Test builds are the only mode that permits
explicit localhost HTTP/WS overrides.

## Cloudflare deployment

One Cloudflare Worker deploys the website, `/join` handoff, health endpoint, WebSocket relay, and
party Durable Object together. Static files bypass Worker execution; `/`, `/health`, `/party/*`, and `/admin/*` run
Worker-first. Local development uses `wrangler dev --local` plus the website dev server.

Deploy the application to production after validation:

```bash
vp run deploy
```

Production uses `https://jelly-party.com` for the website,
`https://join.jelly-party.com/join` for invite handoff, and `wss://meet.jelly-party.com` for party
WebSockets. After deployment, the task smoke-tests all three endpoints and a real secure WebSocket
handshake. All three hostnames route to the same Worker deployment. The browser extension remains a
separately packaged store artifact and is never published by these deploy tasks.

## Private analytics

`https://dashboard.jelly-party.com` shows live party membership and historical usage. Cloudflare
Access protects the entire hostname; configure an Allow policy for the dashboard administrators.
`ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.jsonc` identify that Access application. The
Worker also verifies Access signatures, issuer, audience, and expiry on every dashboard request.

Party Objects send versioned membership snapshots to one LiveStats Object on joins, leaves, and
shared-video changes. The dashboard receives WebSocket pushes. There are no analytics heartbeats,
polls, or alarms; quiet parties remain present, and a missed final disconnect can leave stale counts.
Retries are bounded and analytics failures do not block chat or playback. Each membership report
costs one Durable Object RPC request, plus any failed attempts; idle parties add no analytics requests.

D1 stores party starts, participation once per peer per party, chat counts, playback actions, shared
site changes, and party sizes. Sites are reduced to public registrable domains; analytics excludes
names, peer IDs, invite IDs, video titles, full URLs, IPs, and message contents. Random party keys
relate events within one party, never across parties. History loads on opening the dashboard or
applying a date range. Recent parties are selected by start date and show lifetime participants,
peak size, sites, messages, and connected duration (excluding empty gaps). The list shows the latest
100 starts in the selected range. `vp run deploy` applies the D1 migrations before uploading the Worker.

Cloudflare code deployments disconnect existing party WebSockets; connected users must reconnect.
This is a deployment interruption, separate from the small ongoing analytics overhead.

## Store assets

The Chrome, Edge and Firefox listing images are rendered from the components the extension ships,
not drawn by hand. The website's `/press` route lays out every frame at the exact size each store
expects, and the capture task screenshots them:

```bash
vp run assets:store
```

The images land in `artifacts/press/` beside the store archives, so they are build output rather
than committed files: regenerate them whenever the UI changes and upload from there. Frames are
captured at twice the size each store advertises; run the task with `JELLY_PRESS_SCALE=1` for
exact-size files where a dashboard insists on them. The screenshots use the repository's own
`static/sync-demo.webm` clip; never put a streaming
service's player or footage in a listing image. The accompanying listing text lives in
[docs/store-listing.md](docs/store-listing.md).

## Quality loop

```bash
vp check          # format, lint, and type-check
vp run check:wrangler # generated Cloudflare bindings match wrangler.jsonc
vp test --run     # Vitest
vp run test:analytics # real Workers/D1 analytics and Access authorization tests
vp run test:e2e   # Playwright two-peer flow
vp run test:e2e:firefox # Firefox loaded-extension acceptance flow
vp run test:e2e:production # store build against the deployed /join route
vp run smoke:production # live website, join, health, and WSS handshake
vp run stage      # full release gate, then production builds in fresh browsers
vp run build      # loadable production folders plus validated store ZIPs
vp run build:all  # every deployable build plus store archives
```

Both acceptance flows build a test extension whose manifest pre-grants every origin, so they
cannot see the optional site permission real users hit on their first join. `test:e2e:production`
covers that gap by driving the store build against the deployed `/join` route, through the grant page
that replaces the invite in the same tab and asks for the destination origin. Accepting the
browser's own permission dialog cannot be automated, so finish that step by hand before publishing.

The Chromium Playwright flow is the main acceptance test: it loads two real extension profiles,
creates a party, joins through the shared link, exchanges chat, and synchronizes play, pause, and seek
in both directions. Because Playwright cannot load Firefox WebExtensions, the Firefox task runs the
same high-value flow against a native Firefox sidebar through Selenium. Add focused Vitest coverage
only for logic that can fail independently.
