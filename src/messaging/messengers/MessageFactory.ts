import { ChatMessage } from "../messages/ChatMessage";
import { JoinMessage } from "../messages/JoinMessage";
import { LinkMessage } from "../messages/LinkMessage";
import { MediaEvent } from "../messages/types/MediaEvent";
import { MediaMessage } from "../messages/MediaMessage";
import { NotyfMessage } from "../messages/NotyfMessage";
import { VideoStateMessage } from "../messages/VideoStateMessage";

export class MessageFactory {
  chat(message: string): ChatMessage {
    const msg: ChatMessage = {
      context: "Jelly-Party",
      type: "chat",
      message: message,
    };
    return msg;
  }

  join(partyId: string): JoinMessage {
    const msg: JoinMessage = {
      context: "Jelly-Party",
      type: "join",
      partyId: partyId,
    };
    return msg;
  }

  link(redirectURL: string): LinkMessage {
    const msg: LinkMessage = {
      context: "Jelly-Party",
      type: "link",
      redirectURL: redirectURL,
    };
    return msg;
  }

  media(event: MediaEvent, tick: number): MediaMessage {
    const msg: MediaMessage = {
      context: "Jelly-Party",
      type: "media",
      event: event,
      tick: tick,
    };
    return msg;
  }

  notyf(message: string): NotyfMessage {
    const msg: NotyfMessage = {
      context: "Jelly-Party",
      type: "notyf",
      message: message,
    };
    return msg;
  }

  state(paused: boolean, tick: number): VideoStateMessage {
    const msg: VideoStateMessage = {
      context: "Jelly-Party",
      type: "state",
      paused: paused,
      tick: tick,
    };
    return msg;
  }
}
