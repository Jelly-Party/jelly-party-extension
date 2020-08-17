import { BaseMessage } from "./BaseMessage";

export interface JoinMessage extends BaseMessage {
  type: "join";
  partyId: string;
}
