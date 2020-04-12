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
    this.state = { ...this.state, ...newState }
  }
}