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
    localPeerName: ""
  },
  updateState: function(newState) {
    this.state.isActive = newState.isActive;
    this.state.partyId = newState.partyId;
    this.state.peers = newState.peers;
    this.state.wsIsConnected = newState.wsIsConnected;
    this.state.lastPartyId = newState.lastPartyId;
    this.state.websiteIsTested = newState.websiteIsTested;
    this.state.magicLink = newState.magicLink;
  }
};
