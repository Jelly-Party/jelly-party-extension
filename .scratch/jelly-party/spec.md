# Jelly Party 2.0

Status: ready-for-agent

## Problem Statement

Jelly Party already has the right product: open the extension on a video, create a party, share a link, chat, and keep playback in sync. The current code needs a small production-focused rebuild, not a new product or an elaborate architecture. It must be pleasant to develop, straightforward to package for the existing browser-store listings, and simple enough to finish quickly.

## Solution

Rebuild the existing Jelly Party flow as a small TypeScript monorepo. Keep the familiar create, share, join, chat, play, pause, seek, and leave behavior. Move the extension UI from an injected iframe into the browser sidebar/side panel, keep page integration limited to finding and controlling the video, and connect only to the new backend configured in `config/urls.ts` (`wss://meet.jelly-party.com` by default).

Use Vite+ for the complete development loop, UnoCSS for the design, Playwright for the real two-peer flow, and Vitest only for logic that benefits from focused tests. Publish the result as in-place updates to the existing Chrome, Firefox, and Edge listings.

## User Stories

1. As a viewer, I want the extension toolbar action to open Jelly Party beside my video, so that the website layout is not covered or modified.
2. As a viewer, I want to create a party for the video in my active tab, so that friends can watch with me.
3. As a viewer, I want to copy one magic link, so that a friend can join the same party and video.
4. As an invited viewer, I want the magic link to guide me through installing the extension or granting access to the destination site, so that joining requires no technical knowledge.
5. As an invited viewer, I want to land on the shared video and join the party automatically where the browser permits it, so that joining is quick.
6. As a peer, I want a display name and an emoji, so that other peers can identify me without an avatar system.
7. As a peer, I want to see who is in the party, so that I know my friends connected.
8. As a peer, I want to send, receive, and revisit up to the latest 10,000 party conversation entries for one year after the party ends, so that we can talk while watching and return to the conversation. The chat follows new entries only while I am at the bottom; scrolling up preserves my reading position and offers a clear return to the latest entries.
9. As a peer, I want play, pause, and seek actions to propagate in both directions, so that everyone stays at roughly the same point.
10. As a peer, I want synchronization to use position from the end of the video, so that differing pre-roll durations are less disruptive.
11. As a peer, I want remote playback changes not to echo back into the party, so that one action does not loop.
12. As a peer, I want clear connection, missing-video, permission, and retry states, so that ordinary failures are recoverable.
13. As a peer, I want closing the sidebar to hide the interface without leaving, and an explicit Leave action to end my participation, so that ordinary tab switching never disconnects me accidentally.
14. As a developer, I want one hot-reloading command for the backend, extension, and website, so that changes are visible immediately.
15. As a developer, I want one Vite+ toolchain for runtime management, dependencies, formatting, linting, type-checking, unit tests, builds, and tasks, so that the repository has one obvious workflow.
16. As a releaser, I want deterministic Chrome, Firefox, and Edge packages, so that the existing listings can be updated without manual archive surgery.
17. As a peer, I want one clearly identified leader to choose the party video while everyone retains playback controls, so that changing videos is predictable without votes or accidental takeovers.
18. As a follower, I want my party tab to follow the leader to a newly selected video automatically, so that the party continues without recreating or rejoining it.
19. As a peer, I want compact notices for remote play, pause, seek, video-change, and leadership events, so that synchronized actions remain understandable without cluttering the conversation.
20. As a peer, I want the initial video and accepted video changes recorded as small system entries in chat history, so that the conversation retains the meaningful context of what we watched.
21. As the leader, I want to hand leadership to a connected peer, so that someone else can choose where the party watches next without recreating it.

## Implementation Decisions

- Keep four small source packages: a browser extension, a Cloudflare Worker/party Durable Object relay, a website containing the magic-link `/join` route, and a shared protocol package. Deploy the Worker and website assets as one Cloudflare application.
- Write TypeScript throughout. Use Svelte for extension and website UI, UnoCSS for styling, and browser/platform APIs before adding dependencies.
- Use Vite+ as the only JavaScript toolchain. `vp dev`, `vp check`, `vp test --run`, `vp build`, and Vite Task must cover the standard loop. Do not add another task runner or separate formatter/linter.
- Provide a single Vite Task that hot-reloads the backend and website, opens disposable Chrome and Firefox profiles with the extension installed, and reloads the extension during development.
- Keep at most one active party in the extension background context and associate it with one video tab. The sidebar is a view over that session: closing it only hides the interface, while Leave or closing the associated video tab ends the party. Use a contextual Chrome/Edge `sidePanel` and Firefox `sidebar_action` with thin browser-specific presentation differences.
- On an unrelated tab, Chromium hides the contextual party panel. Firefox shows a compact inactive state that identifies the active party and offers Return to party and Leave; it must never silently control a different tab.
- Keep page code small: find the most relevant HTML video in each accessible frame, report local play/pause/seek, and apply remote actions. Prefer a playing video, otherwise the largest visible playable video, and keep the current choice while it remains credible so that small layout changes do not switch players. Re-evaluate replaced or late-added videos and reinject into newly loaded accessible frames; the background chooses the strongest current candidate across frames. Use extension runtime messaging between the page and sidebar/background; do not inject a visual iframe or maintain a public service-driver framework.
- Keep the old, understandable event-shaped playback behavior. Synchronize finite videos with `timeFromEnd`, suppress echoes, tolerate small drift, and add site-specific handling only after a real site proves it necessary.
- One party remains associated with one browser tab per peer, but its destination may change. The first connected peer is the leader. Only the leader can change the shared destination or hand leadership to another connected peer; everyone may still play, pause, and seek. When the leader's party tab reaches another HTTP(S) page with a credible video, the Durable Object assigns the destination a new revision and followers automatically navigate their party tabs to it. A follower who navigates elsewhere affects only their own tab and can return to the current party destination. If the leader disconnects, the longest-connected remaining peer becomes leader immediately.
- Persist the current destination and its monotonically increasing revision with the party. Playback messages carry that revision, and the backend ignores playback from an older destination. The destination is the top-level page URL; generic control may reach videos in accessible iframes, but reproducing navigation that occurs only inside an opaque embedded player remains out of scope until a real service requires an adapter.
- Record the initial destination, each accepted leader destination change, and each explicit leadership handover as structured, server-generated system entries in the same paged history as chat. Render them as compact timeline rows with actor, subject, and timestamp. Keep remote playback, automatic leadership changes after disconnects, presence, connection, permission, and local-away activity ephemeral; do not persist that operational noise.
- Treat browser-blocked playback as a local, actionable exception rather than a connection failure. Keep the latest remote playback target and show a compact “Press Play once” notice until a manual play interaction lets synchronization resume. Retain per-site access when starting or joining a party so Return can always resume control. Read URL/title metadata for the designated party tab with the `tabs` permission, while retaining optional per-origin host access for actual page injection. A leader who crosses to a new origin gets a direct one-click Allow action before that site can become the shared destination; granting access automatically rescans the page. A follower away from the destination sees a local Return action while the rest of the party continues. Do not expose unrelated per-peer browsing URLs or add remote synchronization-presence states.
- A party has a capability-style random ID, a set of connected peers, and up to its latest 10,000 chat and system history entries. The party Durable Object retains that history for one year after the final peer disconnects, then deletes all party storage. Rejoining before expiry cancels the pending deletion; the countdown begins again after the next final disconnect. A peer has a generated ID, display name, and emoji. There are no avatars or avatar assets.
- Keep party membership compact in the sidebar: always show the leader and connected count in a disclosure summary, with a short vertical member list and separate Leader/You badges when expanded. Do not horizontally scroll names or reserve the full list height while collapsed.
- Magic links contain the party ID and destination video URL in a compact fragment. HTTPS is implied for the common case, the fragment keeps the destination out of server requests, and parsing remains entirely client-side. For an installed extension, the join site hands off in the same tab to an extension-owned confirmation page. Its single click requests optional access when needed, opens the sidebar, navigates to the video, and hands the party ID to the extension. If the browser still refuses to open its sidebar, the toolbar action remains the fallback.
- Production clients connect only to the secure WebSocket endpoint configured in `config/urls.ts` (`wss://meet.jelly-party.com` by default). The protocol may be changed freely; there is no compatibility code for the old backend or extension.
- One Cloudflare Worker deployment serves the static website at `jelly-party.com`, the `/join` handoff at `join.jelly-party.com`, and the WebSocket relay at `meet.jelly-party.com`, and routes each party to one Durable Object. Static assets bypass Worker execution. The object validates incoming message shapes and sensible size limits, broadcasts party/chat/playback/destination messages, persists the current destination plus the latest 10,000 chat and system entries as paged history in embedded SQLite, and exposes a basic health endpoint. Its embedded storage is only used for party state, conversation history, and one-year expiry.
- Build two extension variants from shared source: Chromium and Firefox. Produce three deterministic store archives: Chrome and Edge may use the same Chromium archive; Firefox gets its manifest/sidebar differences and source-review material. Preserve the existing store identities and publish Jelly Party 2.0 over the old listings.
- The interface should feel intentional and compact, but design work must not grow the architecture. UnoCSS owns styling; accessible HTML, keyboard behavior, useful empty/error states, and a responsive sidebar are enough.

## Testing Decisions

- The primary acceptance seam is one Playwright test against a local video fixture, local backend, website `/join` route, and built extension. It creates a party in one browser context, joins through the magic link in a second, verifies both peers and chat, then verifies bidirectional play, pause, and seek. This replaces tests of internal UI structure.
- The Playwright chat flow fills the scroll viewport and verifies attached following, detached position preservation, the new-message affordance, and both explicit and manual reattachment at the bottom.
- Keep a small Playwright test for video replacement/frame selection only if that behavior cannot be covered clearly in the main flow.
- Use Vitest for pure, failure-prone logic such as protocol validation, magic-link parsing, and playback position/echo handling. Do not unit-test trivial components, stores, or wiring.
- Build validation must produce the Chromium and Firefox variants plus the three named store archives and validate their manifests. Chrome and Edge archives should be byte-identical unless a store requirement forces a difference.
- A change is ready when `vp check`, `vp test --run`, the Playwright task, and the all-artifacts build pass from the Nix development environment.

## Out of Scope

- Compatibility with the old protocol or backend.
- Avatars, accounts, social discovery, voice/video chat, or live-stream synchronization.
- Safari, mobile browsers, and browsers other than current Chrome, Firefox, and Edge.
- Site-specific video adapters until generic HTML video behavior demonstrably fails on a site worth supporting.
- A separate database, Kubernetes, multi-region deployment, elaborate observability, staged-rollout machinery, or a browser compatibility lab.
- Reproducing every old visual detail or retaining code solely because the old extension had it.

## Further Notes

- Be pragmatic. Prefer deleting complexity over documenting it.
- The existing extension is behavioral reference material, not an architecture to preserve. Keep what users notice; simplify everything else.
- The implementation should be treated as a short rebuild with one end-to-end flow, not as a platform project.

## Telemetry and recovery

- Keep the private Access-protected dashboard and D1 usage store. Queue usage events and membership snapshots durably inside each party until both sinks acknowledge them. An active party checks its existing heartbeat evidence once per minute and retries outstanding delivery on its alarm; preserve the existing chat-retention countdown when the party becomes empty.
- Distinguish confirmed, ended, and uncertain membership. Open durations stop at the last evidence of presence. Record connected time and time with at least two participants separately; neither is watch time.
- Record bounded onboarding and playback outcomes, browser family, extension version, and test/production source. Correlate playback attempts and results with random per-recipient command IDs. Do not put names, peer IDs, invite IDs, full URLs, message contents, IPs, or arbitrary error text into usage records.
- Reconnect interrupted extension sockets with the same identity, bounded backoff, a welcome deadline, and a heartbeat acknowledgement deadline. Explicit Leave cancels recovery. Suppress duplicate remote seek events without suppressing a different local seek.
- Show the start-to-shared-session funnel, playback outcomes, size distribution, UTC date definitions, freshness, previous-period comparisons, filters, and paginated party histories. Keep draft filters separate from the successfully loaded report. Exclude marked test traffic by default; identify old clients as uninstrumented rather than treating absent outcomes as successful playback.
