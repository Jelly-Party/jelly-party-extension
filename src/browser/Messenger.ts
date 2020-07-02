import { browser, Runtime } from "webextension-polyfill-ts";
import JellyParty from "@/browser/JellyParty";
import VideoHandler from "@/browser/videoHandler";
import { VideoState } from "@/browser/videoHandler";

// MESSAGING API
// MainFrameMessenger
// (1) MainFrameMessenger -> IFrameMessenger: play/pause/seek command -> No reply
// (2) MainFrameMessenger -> IFrameMessenger: videoState update -> No reply
// IFrameMessenger
// (3) IFrameMessenger -> MainFrameMessenger: notyf command (displays notification) -> No reply
// (4) IFrameMessenger -> MainFrameMessenger: videoState dataframe -> Triggers (2)

export type DataFrameType =
  | "notyf"
  | "media"
  | "videoStateRequest"
  | "videoStateResponse";
export type DataFrameMediaVariantType = "play" | "pause" | "seek";
export interface DataFrame {
  type: DataFrameType;
  payload:
    | {
        type: "videoUpdate";
        data: {
          variant: DataFrameMediaVariantType;
          tick: number | undefined;
        };
      }
    | { type: "notification"; message: string }
    | VideoState
    | {};
}

class Messenger {
  port!: Runtime.Port;
  messengerType: string;

  constructor(messengerType: string) {
    this.messengerType = messengerType;
  }
  sendData(dataframe: DataFrame | VideoState) {
    console.log(
      `Jelly-Party: Posting dataframe from ${
        this.messengerType
      }: ${JSON.stringify(dataframe)}`
    );
    this.port.postMessage(dataframe);
  }
}

export class MainFrameMessenger extends Messenger {
  // Playing, pausing and seeking means actually playing, pausing and seeking the video in this context
  // We have direct access to the video, but no access to the JellyParty object.
  videoHandler!: VideoHandler;
  showNotification: (arg0: string) => void;
  constructor(showNotification: (arg0: string) => void) {
    super("MainFrameMessenger");
    this.showNotification = showNotification;
    browser.runtime.onConnect.addListener((port) => {
      this.port = port;
      port.onMessage.addListener((msg) => {
        switch (msg.type) {
          case "media": {
            if (msg.payload.type === "videoUpdate") {
              switch (msg.payload.data.variant) {
                case "play": {
                  this.videoHandler.play();
                  break;
                }
                case "pause": {
                  this.videoHandler.pause();
                  break;
                }
                case "seek": {
                  this.videoHandler.seek(msg.payload.data.tick ?? 0);
                  break;
                }
              }
            } else {
              console.log(
                `Jelly-Party: ${this.messengerType} received erroneous message:`
              );
              console.log(msg);
            }
            break;
          }
          case "notyf": {
            // Call showNotification to trigger a notyf
            this.showNotification(msg.payload.message);
            break;
          }
          case "videoStateRequest": {
            // We must respond to this request with the current video state
            const videoStateDataFrame: DataFrame = {
              type: "videoStateResponse",
              payload: this.videoHandler.getVideoState(),
            };
            this.sendData(videoStateDataFrame);
            break;
          }
          default: {
            console.log(
              `Jelly-Party: ${this.messengerType} received erroneous message:`
            );
            console.log(msg);
          }
        }
      });
    });
  }
}

export class IFrameMessenger extends Messenger {
  // Playing, pausing and seeking in this context means notifying peers
  // We do not have access to the video inside the IFrame.
  party: JellyParty;
  constructor(party: JellyParty) {
    super("IFrameMessenger");
    this.party = party;
    console.log("Jelly-Party: Attempting to connect IFrame with MainFrame.");
    browser.tabs
      .query({
        currentWindow: true,
        active: true,
      })
      .then((tabs) => {
        if (tabs.length > 0) {
          if (tabs[0]?.id) {
            this.port = browser.tabs.connect(tabs[0].id);
            this.port.onMessage.addListener((msg) => {
              switch (msg.type) {
                case "media": {
                  if (msg.payload.type === "videoUpdate") {
                    switch (msg.payload.data.variant) {
                      case "play": {
                        this.party.requestPeersToPlay(msg.payload.data.tick);
                        break;
                      }
                      case "pause": {
                        this.party.requestPeersToPause(msg.payload.data.tick);
                        break;
                      }
                      case "seek": {
                        this.party.requestPeersToSeek(msg.payload.data.tick);
                        break;
                      }
                      default: {
                        console.log(
                          `Jelly-Party: ${this.messengerType} received erroneous message:`
                        );
                        console.error(msg);
                      }
                    }
                  } else {
                    console.log(
                      `Jelly-Party: ${this.messengerType} received erroneous message:`
                    );
                    console.log(msg);
                  }
                  break;
                }
                case "videoStateResponse": {
                  // We resolve a video state promise that gets created upon calling the async
                  // JellyParty.getVideoState(). This is essentially the same as using a Deferred
                  // see https://stackoverflow.com/questions/26150232/resolve-javascript-promise-outside-function-scope
                  this.party.resolveVideoState(msg.payload);
                  break;
                }
                default: {
                  console.log(
                    `Jelly-Party: ${this.messengerType} received erroneous message:`
                  );
                  console.log(msg);
                }
              }
            });
            this.party.displayNotification("Jelly Party loaded!");
          }
        }
      });
  }
}

// export class IFrameMessenger extends Messenger {
//   getVideoState: () => Promise<VideoState>;
//   constructor(party: JellyParty) {
//     super("IFrameMessenger");
//     this.receiveMessage = (
//       dataframe: DataFrame,
//       response: Runtime.MessageSender
//     ) => {
//       switch (dataframe.type) {
//         case "media": {
//           if (dataframe.payload.type === "videoUpdate") {
//             switch (dataframe.payload.data.variant) {
//               case "play": {
//                 party.dataframePeersToPlay(dataframe.payload.data.tick);
//                 break;
//               }
//               case "pause": {
//                 party.dataframePeersToPause(dataframe.payload.data.tick);
//                 break;
//               }
//               case "seek": {
//                 party.dataframePeersToSeek(dataframe.payload.data.tick);
//                 break;
//               }
//             }
//           } else {
//             console.log(
//               `Jelly-Party: ${this.type} received erroneous message:`
//             );
//             console.log(dataframe);
//           }
//           break;
//         }
//         default: {
//           console.log(`Jelly-Party: ${this.type} received erroneous message:`);
//           console.log(dataframe);
//         }
//       }
//     };
//     this.getVideoState = async () => {
//       return await browser.runtime
//         .sendMessage({
//           type: "videoStateDataFrame",
//         })
//         .catch((err) => {
//           console.error(`Jelly-Party: IFrameMessenger Error: ${err}`);
//         });
//     };
//     this.addMessageListener(this.receiveMessage);
//   }
// }

// class Messenger {
//   receiveMessage!: (arg0: DataFrame, arg1: Runtime.MessageSender) => void;
//   type: string;
//   constructor(type: "IFrameMessenger" | "MainFrameMessenger") {
//     this.type = type;
//   }

//   addMessageListener(
//     receiveMessage: (arg0: DataFrame, arg1: Runtime.MessageSender) => void
//   ) {
//     browser.runtime.onMessage.addListener((dataframe, sender) => {
//       console.log(
//         `Jelly-Party: ${
//           this.type
//         } received dataframe. DataFrame is ${JSON.stringify(dataframe)}`
//       );
//       receiveMessage(dataframe, sender);
//     });
//   }

//   sendData(dataframe: DataFrame) {
//     console.log(
//       `Jelly-Party: ${this.type} send dataframe: ${JSON.stringify(dataframe)}`
//     );
//     browser.runtime.sendMessage(dataframe).catch((err) => {
//       console.error(`Jelly-Party: Messaging error: ${err}`);
//     });
//   }
// }

// export class MainFrameMessenger extends Messenger {
//   constructor(videoHandler: VideoHandler) {
//     super("MainFrameMessenger");
//     this.receiveMessage = (dataframe: DataFrame, sender: Runtime.MessageSender) => {
//       switch (dataframe.type) {
//         case "media": {
//           if (dataframe.payload.type === "videoUpdate") {
//             switch (dataframe.payload.data.variant) {
//               case "play": {
//                 videoHandler.play();
//                 break;
//               }
//               case "pause": {
//                 videoHandler.pause();
//                 break;
//               }
//               case "seek": {
//                 videoHandler.seek(dataframe.payload.data.tick ?? 0);
//                 break;
//               }
//             }
//           } else {
//             console.log(
//               `Jelly-Party: ${this.type} received erroneous message:`
//             );
//             console.log(dataframe);
//           }
//           break;
//         }
//         case "notyf": {
//           break;
//         }
//         case "videoStateDataFrame": {
//           sender.send;
//           break;
//         }
//         default: {
//           console.log(`Jelly-Party: ${this.type} received erroneous message:`);
//           console.log(dataframe);
//         }
//       }
//     };
//     this.addMessageListener(this.receiveMessage);
//   }
// }

// Reset event counter, based on the command we receive. We will not forward
// events until we have dealt with the command to prevent infinite loops.
// this.videoHandler.eventsToProcess = 0;
