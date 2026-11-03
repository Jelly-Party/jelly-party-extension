# Releasing

Run release commands from the repository root in the Nix development environment.
The deployment task uploads the website and relay; extension store uploads and review submissions are manual.

## Validate and deploy

Set `RELEASE_VERSION` in `config/release.ts` to a version higher than the published store versions,
and update `packages/jelly-party-extension/SOURCE-REVIEW.md` to match. Preserve the existing store
identities and Firefox add-on ID.

```sh
vp install --frozen-lockfile
vp run deploy
vp run test:e2e:production
vp run stage
```

`deploy` runs the local checks, tests, and builds, applies remote D1 migrations, deploys the website
and relay together, then verifies the live endpoints and release version. `test:e2e:production`
checks the production invitation handoff through the browser permission request.

`stage` repeats validation, produces the deterministic store archives, checks production, and
opens the packaged extension in fresh Chrome and Firefox profiles. Finish the browser-owned site
permission prompts by hand. With two peers, verify create, share, join, chat, play, pause, and seek
against production, including recovery after a page replaces or removes its video player. Close
both staging browsers when finished.

## Download the archives

The build leaves four ZIPs in `artifacts/`, with SHA-256 hashes printed by the packaging task:

| Archive                                    | Upload destination                                  |
| ------------------------------------------ | --------------------------------------------------- |
| `jelly-party-<version>-chrome.zip`         | Existing Chrome Web Store listing                   |
| `jelly-party-<version>-edge.zip`           | Existing Microsoft Edge Add-ons listing             |
| `jelly-party-<version>-firefox.zip`        | Existing Firefox Add-ons listing, extension package |
| `jelly-party-<version>-firefox-source.zip` | Firefox source code submission                      |

Chrome and Edge packages are byte-identical. Upload the ZIPs as built.

When building on a remote host, run this on the Mac that will upload the files:

```sh
scp '<ssh-host>:<checkout>/artifacts/jelly-party-<version>-*.zip' ~/Downloads/
```

Replace `<ssh-host>` with the configured SSH destination, `<checkout>` with the remote repository
path, and `<version>` with `RELEASE_VERSION`. Check that all four files arrived before uploading.

## Update the existing listings

- [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole): select Jelly Party,
  open Package, upload the Chrome ZIP, complete any required fields, and submit the update for
  review. See the [Chrome update guide](https://developer.chrome.com/docs/webstore/update/).
- [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/): select Jelly Party and
  upload a new version using the Firefox ZIP. Provide the Firefox source ZIP when asked for source
  code; its `SOURCE-REVIEW.md` contains the build instructions. Complete validation and submission
  prompts. See Mozilla's [submission guide](https://www.extensionworkshop.com/documentation/publish/submitting-an-add-on/).
- [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/public/login?ref=dd):
  select the existing Jelly Party extension, upload the Edge ZIP, complete any required fields,
  and publish the update for certification. See the [Edge update guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/update-extension).

Use the current listing text in [store-listing.md](store-listing.md). Regenerate images with
`vp run assets:store` if the UI changed. After each store makes the update available, confirm the
version and invitation flow using the store-installed extension.
