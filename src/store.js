export default {
  state: {
    debug: process.env.NODE_ENV === "development",
    isActive: false,
    partyId: "",
    peers: [],
    wsIsConnected: false,
    lastPartyId: "",
    websiteIsTested: false,
    magicLink: "",
    localPeerName: "",
    favicon: "",
    video: ""
  },
  updateState: function(newState) {
    try {
      this.state.isActive = newState.isActive;
      this.state.localPeerName = newState.localPeerName;
      this.state.partyId = newState.partyId;
      this.state.peers = newState.peers;
      this.state.wsIsConnected = newState.wsIsConnected;
      this.state.lastPartyId = newState.lastPartyId;
      this.state.websiteIsTested = newState.websiteIsTested;
      this.state.magicLink = newState.magicLink;
      this.state.favicon = newState.favicon;
      this.state.video = Boolean(newState.video);
    } catch (e) {
      console.log(
        `Error updating party state for newState of ${JSON.stringify(newState)}`
      );
      console.log(e);
    }
  }
};
