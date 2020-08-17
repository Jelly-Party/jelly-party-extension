import { MessageType } from "./types/MessageType";

// Parent Message class wich messages inherit from
export interface BaseMessage {
  context: "Jelly-Party";
  type: MessageType;
}
