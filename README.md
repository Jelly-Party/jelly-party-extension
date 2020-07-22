# Jelly-Party-Extension

## Contribute using the staging server [easy]
```
npm install
npm run stage
```
This will compile the project and serve it under `dist`, which you can load unpacked into Chrome or Firefox. Furthermore, this spins up `vue-remote-devtools` for debugging purposes.

Note that you'll connect to the staging server (`staging.jelly-party.com`) instead of the live server (`ws.jelly-party.com`).

## Contribute using your own server [advanced]
Please head to the [Jelly-Party-Server](https://github.com/seandlg/jelly-party-server) repository and spin up a server instance. Then edit your `/etc/hosts/` file and add `127.0.0.1   staging.jelly-party.com`. If you wish, you can set up your custom domain, though you'll need to tweak both Jelly-Party-Extension and Jelly-Party-Server.


### Compile and minify for production
```
npm run build
```
