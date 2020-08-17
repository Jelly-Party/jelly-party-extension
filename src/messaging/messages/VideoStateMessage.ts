import { BaseMessage } from "./BaseMessage";

export interface VideoStateMessage extends BaseMessage {
  type: "state";
  paused: boolean;
  tick: number;
}
