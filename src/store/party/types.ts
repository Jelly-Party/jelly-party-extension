export interface Peer {
  uuid: string;
  clientName: string;
  currentlyWatching: string;
  videoState: {
    paused: boolean;
    currentTime: number;
  };
}

export interface PartyState {
  isActive: boolean;
  partyId: string;
  peers: Array<Peer>;
  wsIsConnected: boolean;
  lastPartyId: string;
  websiteIsTested: boolean;
  magicLink: string;
}

// The video state is not stored in the PartyState, since it updates all the time,
// but we don't need to react to its updates. Instead, we query it upon certain events.
