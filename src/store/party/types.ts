export interface PartyState {
  isActive: boolean;
  partyId: string;
  peers: Array<string>;
  wsIsConnected: boolean;
  lastPartyId: string;
  websiteIsTested: boolean;
  favicon: string;
  video: object;
}
