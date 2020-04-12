export default {
  state: {
    debug: process.env.NODE_ENV === "development",
    isActive: false,
    partyId: "",
    peers: [],
    websocketConnection: false,
    lastPartyId: "",
    websiteIsTested: false,
    name: "guest",
    magicLink: ""
  },
  updateState: function (newState) {
    this.state.isActive = newState.isActive
    this.state.partyId = newState.partyId
    this.state.peers = newState.peers
    this.state.websocketConnection = newState.websocketConnection
    this.state.lastPartyId = newState.lastPartyId
    this.state.websiteIsTested = newState.websiteIsTested
    this.state.name = newState.name
    this.state.magicLink = newState.magicLink
  }
}