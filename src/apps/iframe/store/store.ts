import { RootState, PartyState, OptionsState } from "./types";

export interface AppStateInterface {
  RootState: RootState;
  PartyState: PartyState;
  OptionsState: OptionsState;
}

export const InitialState: AppStateInterface = {
  RootState: {
    sideBarMinimized: false,
    connectedToServer: false,
    connectingToServer: false,
    appTitle: process.env.VUE_APP_TITLE ?? "appTitle",
    appMode: process.env.VUE_APP_MODE ?? "appMode",
  },
  PartyState: {
    isActive: false,
    partyId: "",
    peers: [],
    cachedPeers: [],
    websiteIsTested: false,
    magicLink: "",
    selfUUID: "",
    videoState: { paused: true, tick: 0 },
    showChat: true,
    chatMessages: [
      {
        type: "chatMessage",
        data: {
          text: "Press play/pause once to start the sync.",
          timestamp: Date.now(),
        },
      },
    ],
    maxChatMessagesDisplay: 200,
  },
  OptionsState: {
    clientName: "guest",
    darkMode: true,
    onlyIHaveControls: false,
    statusNotificationsInChat: true,
    statusNotificationsNotyf: true,
    previousParties: [],
    guid: "",
    lastPartyId: "",
    showNotificationsForSelf: false,
    avatarState: {
      accessoriesType: "Round",
      clotheType: "ShirtScoopNeck",
      clotheColor: "White",
      eyebrowType: "Default",
      eyeType: "Default",
      facialHairColor: "Auburn",
      facialHairType: "Blank",
      graphicType: "Hola",
      hairColor: "Auburn",
      mouthType: "Twinkle",
      skinColor: "Light",
      topType: "ShortHairShortCurly",
    },
  },
};
