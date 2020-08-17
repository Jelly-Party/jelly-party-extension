export const MessageType = {
  Media: "media",
  State: "state",
  Join: "join",
  Link: "link",
  Chat: "chat",
  Notyf: "notyf",
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];
