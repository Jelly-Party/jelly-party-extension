import { MediaMessage } from "../MediaMessage";
import { MessageType } from "./MessageType";
import { VideoStateMessage } from "../VideoStateMessage";
import { JoinMessage } from "../JoinMessage";
import { LinkMessage } from "../LinkMessage";
import { ChatMessage } from "../ChatMessage";
import { NotyfMessage } from "../NotyfMessage";

export type MessageMatcher<Out> = {
  [MessageType.Chat]: (Message: ChatMessage) => Out;
  [MessageType.Join]: (Message: JoinMessage) => Out;
  [MessageType.Link]: (Message: LinkMessage) => Out;
  [MessageType.Media]: (Message: MediaMessage) => Out;
  [MessageType.State]: (Message: VideoStateMessage) => Out;
  [MessageType.Notyf]: (Message: NotyfMessage) => Out;
};
