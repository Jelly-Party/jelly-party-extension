import { BaseMessage } from "./BaseMessage";

export interface NotyfMessage extends BaseMessage {
  type: "notyf";
  message: string;
}
