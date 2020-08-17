import { BaseMessage } from "./BaseMessage";

export interface LinkMessage extends BaseMessage {
  type: "link";
  redirectURL: string;
}
