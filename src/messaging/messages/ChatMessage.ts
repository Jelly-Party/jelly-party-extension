import { BaseMessage } from "./BaseMessage";

export interface ChatMessage extends BaseMessage {
  type: "chat";
  message: string;
}
