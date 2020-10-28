# Jelly-Party-Extension

This repo contains all code for the browser extension [Jelly-Party](https://chrome.google.com/webstore/detail/jelly-party/aiecbkandfgpphpdilbaaagnampmdgpd). Jelly-Party syncs video playback between a group of peers.

## Contribute using the staging server [easy]

```
npm install
npm run 'stage devtools'
```

This will compile the project and serve it under `dist`, which you can load unpacked into Chrome or Firefox. Furthermore, this spins up `vue-remote-devtools` for debugging purposes.

Note that you'll connect to the staging server (`staging.jelly-party.com`) instead of the live server (`ws.jelly-party.com`).

## Contribute using your own server [advanced]

Please head to the [Jelly-Party-Server](https://github.com/seandlg/jelly-party-server) repository and spin up a server instance. You must set up your custom domain. You'll need to tweak Jelly-Party-Server.

To use your server by the browser extension define environment variable `VUE_APP_WS_ADDRESS`. You could save it in a new file `.env.local` or `.env.[mode].local`. For more information see [Vue CLI Modes and Environment Variables](https://cli.vuejs.org/guide/mode-and-env.html).


### Compile and minify for production

```
npm run build
```

## Testing

As a browser extension, Jelly-Party is inherently more difficult to test than e.g. pure `javascript` libraries. For now, we have a semi-automatic setup using [`puppeteer`](https://github.com/puppeteer/puppeteer/) coupled with a local Chrome installation.

### Setup

Copy `config.template.ts` to `config.ts`.

```bash
cd jelly-party-extension
cp tests/config.template.ts tests/config.ts
```

The file will look as follows:

```ts
export const config = {
  chromePath: "/opt/google/chrome/google-chrome",
  ublockPath:
    "/home/user/.config/google-chrome/Profile 1/Extensions/cjpalhdlnbpafiamejdnhcphjbkeiagm/1.28.4_0",
  cookies: {
    netflix: [],
    disneyPlus: [],
  },
};
```

Edit `chromePath` (mandatory) & `ublockPath` (optional — required if you want Chrome to launch with [`uBlock Origin`](https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm)) and add any session cookies you have for `netflix`, `disneyPlus` and other providers. `chromePath` is required, because DRM-protected services (most of them use [`widevine`](https://widevine.com/)) do not allow playback in [`Chromium`](https://www.chromium.org/) browsers.

### Run semi-automatic test

Make sure the provider is configured correctly in `tests/src/index.ts`. At the very least, your provider will require a _magic link_. If the provider requires a login, you'll also need to specify a `setCookiesAtURL` (navigated to once, to set the cookies) and a `cookies` parameter.
