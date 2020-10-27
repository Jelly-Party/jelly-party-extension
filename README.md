# jpe-2

## Project setup

```
npm install
```

This will compile the project and serve it under `dist`, which you can load unpacked into Chrome or Firefox. Furthermore, this spins up `vue-remote-devtools` for debugging purposes.

Note that you'll connect to the staging server (`staging.jelly-party.com`) instead of the live server (`ws.jelly-party.com`).

## Contribute using your own server [advanced]

Please head to the [Jelly-Party-Server](https://github.com/seandlg/jelly-party-server) repository and spin up a server instance. You must set up your custom domain. You'll need to tweak Jelly-Party-Server.

To use your server by the browser extension define environment variable `VUE_APP_WS_ADDRESS`. You could save it in a new file `.env.local` or `.env.[mode].local`. For more information see [Vue CLI Modes and Environment Variables](https://cli.vuejs.org/guide/mode-and-env.html).

### Compile and minify for production

### Compiles and minifies for production

```
npm run build
```

### Lints and fixes files

```
npm run lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).
