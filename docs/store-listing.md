# Jelly Party store listing

Submission copy, permission explanations, and reviewer notes for the Chrome Web Store, Microsoft
Edge Add-ons, and addons.mozilla.org. Keep this file aligned with the shipping extension and the
[privacy policy](https://jelly-party.com/privacy-policy).

## Listing identity

- **Name:** Jelly Party
- **Short summary:** Watch videos with your friends—in sync. Start a party beside any video, share
  one link, and chat while you watch.
- **Category:** Entertainment (Chrome and Edge) / Social & Communication (Firefox)
- **Tags:** watch party, watch together, sync video, video chat, remote movie night
- **Website:** https://jelly-party.com
- **Support:** https://github.com/Jelly-Party/jelly-party-extension/issues
- **Privacy policy:** https://jelly-party.com/privacy-policy
- **Supported services:** https://jelly-party.com/supported-services

## Description

Jelly Party turns a video you can already watch into a watch party.

Open Jelly Party beside the video, start a party, and send your friends the invite link. Everyone
lands on the same video. When the leader changes videos, every party tab follows automatically, and
play, pause, and seek carry to every screen. Chat and the people list live in the browser's native
sidebar, so the page you are watching is left alone.

- Private through one long, unguessable link. No accounts, profiles, or room codes.
- One clearly marked leader picks the video and can hand the lead to anyone in the party.
- Everyone stays at the same moment: play, pause, and seek are shared.
- Late joiners arrive at the current moment instead of starting at the beginning.
- Video changes and leadership handovers remain visible in the party history.
- Works on popular streaming services and other pages with an HTML5 video.
- Free and open source.

Jelly Party asks for access to a video site only when it needs to find and control that site's video.
Anyone with the unguessable party link can join, so share it only with the people you want to invite.

## Images

Run `vp run assets:store` to regenerate every submission image in the ignored `artifacts/press/`
directory. The frames use shipping components and the repository's own `sync-demo.webm`; they do
not show third-party players, trademarks, or footage.

| File                           | Listing position                         |
| ------------------------------ | ---------------------------------------- |
| `01-watch-together.png`        | Screenshot 1 — 1280×800                  |
| `02-start-a-party.png`         | Screenshot 2 — 1280×800                  |
| `03-chat-beside-the-video.png` | Screenshot 3 — 1280×800                  |
| `04-everyone-in-sync.png`      | Screenshot 4 — 1280×800                  |
| `05-works-where-you-watch.png` | Screenshot 5 — 1280×800                  |
| `promo-small-tile.png`         | Chrome Web Store small tile — 440×280    |
| `promo-marquee.png`            | Chrome Web Store marquee tile — 1400×560 |
| `store-logo.png`               | Edge Add-ons store logo — 300×300        |
| Extension `icons/128x128.png`  | Chrome and Firefox icon — 128×128        |

The capture task writes images at twice the listed dimensions for high-density displays. If a store
requires the exact dimensions, run `JELLY_PRESS_SCALE=1 vp run assets:store`. Run
`vp run assets:icons` after changing `packages/jelly-party-website/static/jelly-party.svg` to
regenerate the browser icon sizes from the vector source.

## Chrome Web Store dashboard copy

### Single purpose description

Create a private watch party beside the active video and synchronize its play, pause, seek, and
destination with invited participants.

### activeTab justification

Temporarily accesses the current tab after the user clicks Jelly Party so it can detect and control
that tab's video without requiring permanent access to every site.

### scripting justification

Injects the packaged video controller into the selected tab and its frames. The controller only
finds HTML video elements, reads playback state, and applies synchronized play, pause, and seek
commands. No remote code is executed.

### tabs justification

Reads the selected party tab's URL and title, keeps the sidebar associated with that tab, navigates
followers when the leader changes videos, and focuses the party tab when the user selects Return.

### storage justification

Stores the locally generated peer identifier, display name, and emoji. It may briefly store a
pending invitation while the destination tab opens.

### sidePanel justification

Displays the party controls, chat, people list, and status in Chrome and Edge's native side panel.

### Host permission justification

Required host access is limited to `https://join.jelly-party.com/*` for invite handoff and
`https://meet.jelly-party.com/*` for party creation and WebSocket communication.

### Optional host permission justification

Access to HTTP and HTTPS video pages is requested one site at a time, only after the user starts or
joins a party there or chooses Allow after navigating to a new site. It is needed to inject the
packaged video controller into all frames because a page's active video may be inside an iframe.

### Data-use disclosure

- **Personal communications:** Party chat, display name, and emoji are sent to the Jelly Party relay
  so invited participants can see them.
- **Website content and browsing activity:** The shared video's URL, title, and playback timing are
  sent to the relay to identify the party destination, record video changes, and synchronize peers.
- **User identifiers:** A random peer identifier is generated locally and sent with party messages
  so the relay can distinguish participants. Jelly Party has no accounts.
- **Usage statistics:** The relay records party activity and shared-site domains. The extension
  reports permission, video, and playback outcomes with browser family and extension version.
  Usage records exclude full URLs, chat contents, names, emoji, IP addresses, and invitation identifiers.
- Data is used for watch-party features and reliability statistics. It is not sold, used for
  advertising or creditworthiness, or transferred for unrelated purposes.
- The extension contains no advertising SDK or remotely hosted executable code.

## Firefox data disclosure

The Firefox manifest declares browsing activity, personal communications, personally identifying
information, and website activity because the extension processes the shared URL and title, chat,
display name, emoji, and random peer identifier through the Jelly Party relay. The same data-use
limits described above apply. Firefox's sidebar remains closed after installation; the user's first
toolbar click opens it and grants temporary access to the selected tab.

## Reviewer notes

1. Install Jelly Party in two browser profiles. No extension-specific account or credentials are
   required.
2. Open an ordinary page containing an HTML5 video, then select the Jelly Party toolbar action. The
   extension opens in the browser's native sidebar or side panel and identifies the video.
3. Choose a display name and emoji, select **Start a party**, and copy the invite link.
4. Open the invite in the second profile. The extension-owned handoff page requests access to the
   shared video's site; select **Allow and join**.
5. Play, pause, or seek in either profile to see the other video synchronize. Send a chat message to
   verify the relay.
6. Expand the people row and use **Make leader**. When the new leader navigates the party tab to a
   different supported video page, the other party tab follows.
7. After cross-origin navigation, Jelly Party asks for that new site's access if it has not already
   been granted. Browser-protected pages and pages without a controllable HTML5 video cannot sync.
8. All extension code is packaged locally. `https://meet.jelly-party.com` is the only application
   backend; it creates parties and carries party WebSocket traffic.
