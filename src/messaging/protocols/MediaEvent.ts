export const MediaEvent = {
  Play: "play",
  Pause: "pause",
  Seek: "seek",
  Toggle: "toggle",
} as const;

export type MediaEvent = typeof MediaEvent[keyof typeof MediaEvent];
