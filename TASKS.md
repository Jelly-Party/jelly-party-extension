# Open tasks

- [ ] Client: prune removed video frames from discovery. Removing the selected iframe leaves "Video ready" and controls target its deleted frame, even after a rescan. Reproduce with a small page video plus a larger iframe, remove the iframe, and verify control switches to the remaining video. Include in the next planned extension release with browser regression coverage; server changes cannot clear a client's frame cache. See [frame discovery](packages/jelly-party-extension/src/background/index.ts).
