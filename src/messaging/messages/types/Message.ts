import { MediaMessage } from "../MediaMessage";
import { VideoStateMessage } from "../VideoStateMessage";
import { JoinMessage } from "../JoinMessage";
import { LinkMessage } from "../LinkMessage";
import { ChatMessage } from "../ChatMessage";
import { NotyfMessage } from "../NotyfMessage";

export type Message =
  | ChatMessage
  | JoinMessage
  | LinkMessage
  | MediaMessage
  | NotyfMessage
  | VideoStateMessage;
