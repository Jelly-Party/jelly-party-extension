import { DeferredPromise } from "@/helpers/deferredPromise";
import uuidv4 from "@/helpers/uuidv4.js";
import { VideoState } from "@/sidebar/provider/providers/Controller";

// Every frame must have a context and a deferred promise Id
interface BaseFrame {
  deferredPromiseId?: string;
  context: "Jelly-Party";
}

export interface NotyfFrame extends BaseFrame {
  type: "notyf";
  payload: {
    type: "notification";
    message: string;
  };
}

export type DataFrameMediaVariantType =
  | "play"
  | "pause"
  | "seek"
  | "togglePlayPause";

export interface MediaCommandFrame extends BaseFrame {
  type: "media";
  payload: {
    type: "videoUpdate";
    data: {
      variant: DataFrameMediaVariantType;
      tick?: number;
    };
  };
}

export interface SimpleRequestFrame extends BaseFrame {
  type:
    | "videoStateRequest"
    | "joinPartyRequest"
    | "baseLinkRequest"
    | "chatNotification"
    | "toggleFullScreen";
}

export interface VideoStateResponseFrame extends BaseFrame {
  type: "videoStateResponse";
  payload: VideoState;
}

export interface JoinPartyCommandFrame extends BaseFrame {
  type: "joinPartyCommand";
  payload: {
    partyId: string;
  };
}

export interface BaseLinkResponseFrame extends BaseFrame {
  type: "baseLinkResponse";
  payload: {
    baseLink: string;
  };
}

export interface MessageResolvedFrame extends BaseFrame {
  type: "messageResolved";
}

export type MultiFrame =
  | NotyfFrame
  | MediaCommandFrame
  | SimpleRequestFrame
  | VideoStateResponseFrame
  | JoinPartyCommandFrame
  | BaseLinkResponseFrame
  | MessageResolvedFrame;

export abstract class AbstractMessenger {
  public messengerType: string;
  deferredPromises: { [id: string]: DeferredPromise };

  abstract setupMessageHandler(): void;

  constructor(messengerType: string) {
    this.messengerType = messengerType;
    this.deferredPromises = {};
  }

  resolvePromise(promiseId: string) {
    if (this.deferredPromises[promiseId]) {
      this.deferredPromises[promiseId].resolve();
    }
  }

  async sendMessage(dataFrame: MultiFrame) {
    // Create a unique identifier for the deferred promise
    const deferredPromiseId = uuidv4();
    // Add the unique Id to the dataframe, so we can match against the response frame Id
    dataFrame.deferredPromiseId = deferredPromiseId;
    // Create the deferred promise
    const deferredPromise = new DeferredPromise();
    // Save the deferred promise to a dictionary, so we can access it by Id later
    this.deferredPromises[deferredPromiseId] = deferredPromise;
    // Send out the actual request
    this.sendDataFrame(dataFrame);
    deferredPromise.then(() => {
      // Remove the promise from the dictionary
      delete this.deferredPromises[deferredPromiseId];
    });
    // Resolve either when the deferredPromise resolves or after a 2s timeout
    return Promise.race([
      deferredPromise,
      new Promise((resolve, reject) => {
        setTimeout(() => {
          delete this.deferredPromises[deferredPromiseId];
          reject(
            `Jelly-Party: Deferred promise "${deferredPromiseId}" timed out.`,
          );
        }, 2000);
      }),
    ]);
  }

  abstract sendDataFrame(dataFrame: MultiFrame): void;
}
