# Jelly-Party-Extension

This repo contains all code for the browser extension [Jelly-Party](https://chrome.google.com/webstore/detail/jelly-party/aiecbkandfgpphpdilbaaagnampmdgpd). Jelly-Party syncs video playback between a group of peers.

## Contribute using the staging server [easy]

```
npm install
npm run stage
```

This will compile the project and serve it under `dist`, which you can load unpacked into Chrome or Firefox. Furthermore, this spins up `vue-remote-devtools` for debugging purposes.

Note that you'll connect to the staging server (`staging.jelly-party.com`) instead of the live server (`ws.jelly-party.com`).

## Contribute using your own server [advanced]

Please head to the [Jelly-Party-Server](https://github.com/seandlg/jelly-party-server) repository and spin up a server instance. You must set up your custom domain and you'll need to tweak both Jelly-Party-Extension and Jelly-Party-Server.

### Compile and minify for production

```
npm run build
```
