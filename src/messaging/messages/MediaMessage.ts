import { BaseMessage } from "./BaseMessage";
import { MediaEvent } from "./types/MediaEvent";

export interface MediaMessage extends BaseMessage {
  type: "media";
  event: MediaEvent;
  tick: number;
}
