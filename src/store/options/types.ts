export interface AvatarState {
  accessoriesType: string;
  clotheType: string;
  clotheColor: string;
  eyebrowType: string;
  eyeType: string;
  facialHairColor: string;
  facialHairType: string;
  graphicType: string;
  hairColor: string;
  mouthType: string;
  skinColor: string;
  topType: string;
}

export interface PreviousParty {
  partyId: string;
  members: Array<string>;
  dateInfo: object;
}

export interface OptionsState {
  clientName: string;
  darkMode: boolean;
  onlyIHaveControls: boolean;
  statusNotificationsInChat: boolean;
  statusNotificationsNotyf: boolean;
  guid: string;
  avatarState: AvatarState;
  previousParties: Array<PreviousParty>;
}
