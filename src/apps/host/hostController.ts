import getHost, { Hosts } from "@/helpers/domain/getHost";
import { ProtoframePubsub } from "@/helpers/protoframe-webext";
import { HostControllerProtocol, HostDescriptor } from "@/messaging/Protocol";
import { AmazonCustomizer } from "@/providers/amazon/AmazonCustomizer";
import { Customizer } from "@/providers/Customizer";
import { DefaultCustomizer } from "@/providers/default/DefaultCustomizer";
import { DisneyPlusCustomizer } from "@/providers/disneyplus/DisneyPlusCustomizer";
import { NetflixCustomizer } from "@/providers/netflix/NetflixCustomizer";
import { VimeoCustomizer } from "@/providers/vimeo/VimeoCustomizer";
import { YouTubeCustomizer } from "@/providers/youtube/YouTubeCustomizer";
import { browser, Runtime } from "webextension-polyfill-ts";
import { Wrapper } from "./DOMComponents/Wrapper";
import { Notyf } from "notyf";
import "notyf/notyf.min.css";

class HostController {
  host: Hosts;
  styleCustomizer: Customizer;
  messagingPort: Runtime.Port;
  pubsub: ProtoframePubsub<HostControllerProtocol>;
  notyf: Notyf;

  constructor() {
    // Get host
    this.host = getHost(window.location.host);
    // Create actual DOM components
    new Wrapper();
    // Create style customizer
    switch (this.host) {
      case "amazon": {
        this.styleCustomizer = new AmazonCustomizer();
        break;
      }
      case "disneyplus": {
        this.styleCustomizer = new DisneyPlusCustomizer();
        break;
      }
      case "netflix": {
        this.styleCustomizer = new NetflixCustomizer();
        break;
      }
      case "vimeo": {
        this.styleCustomizer = new VimeoCustomizer();
        break;
      }
      case "youtube": {
        this.styleCustomizer = new YouTubeCustomizer();
        break;
      }
      default: {
        this.styleCustomizer = new DefaultCustomizer();
        break;
      }
    }
    // Set up notyf
    this.notyf = new Notyf({
      duration: 1000,
      position: {
        x: "center",
        y: "top",
      },
      types: [
        {
          type: "success",
          background:
            "linear-gradient(to right bottom, rgb(255, 148, 148) 0%, rgb(238, 100, 246) 100%)",
          icon: {
            className: "material-icons",
            tagName: "i",
          },
        },
      ],
    });
    // Connect to the background script
    this.messagingPort = browser.runtime.connect(undefined, {
      name: "hostController",
    });
    this.pubsub = ProtoframePubsub.build(HostDescriptor, this.messagingPort);
    this.pubsub.handleAsk("getURL", async () => {
      return { url: window.location.href };
    });
    this.pubsub.handleTell("toggleFullscreen", () => {
      document.body.requestFullscreen();
    });
    this.pubsub.handleTell("displayNotification", async ({ text }) => {
      this.notyf.success(text);
    });
  }
}

new HostController();
