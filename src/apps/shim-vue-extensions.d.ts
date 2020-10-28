import { IFrame } from "./iframe/IFrame";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $iframe: IFrame;
  }
}
