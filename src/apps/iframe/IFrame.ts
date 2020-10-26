import Vue from "vue";
import Sidebar from "./views/Sidebar.vue";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import log from "loglevel";
import { AppState, InitialState } from "./store/store";
import { stableWebsites } from "@/helpers/domains/stableWebsites";
import { browser, Runtime } from "webextension-polyfill-ts";
import {
  JellyPartyDescriptor,
  JellyPartyProtocol,
} from "../messaging/Protocol";
import { ProtoframePubsub } from "@/helpers/protoframe-webext";

declare module "vue/types/vue" {
  interface Vue {
    $iframe: IFrame;
  }
}

Vue.directive("click-outside", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bind: function(el: any, binding, vnode: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    el.clickOutsideEvent = function(event: any) {
      if (!(el == event.target || el.contains(event.target))) {
        vnode.context[binding.expression](event);
      }
    };
    document.body.addEventListener("click", el.clickOutsideEvent);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unbind: function(el: any) {
    document.body.removeEventListener("click", el.clickOutsideEvent);
  },
});

// Install BootstrapVue & BootstrapVue icon components
Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

export class IFrame {
  appState: AppState;
  messagingPort: Runtime.Port;
  stableWebsite!: boolean;
  pubsub: ProtoframePubsub<JellyPartyProtocol>;

  constructor() {
    this.messagingPort = browser.runtime.connect(undefined, { name: "iframe" });
    this.pubsub = ProtoframePubsub.build(
      JellyPartyDescriptor,
      this.messagingPort
    );
    this.pubsub.handleAsk("getURL", async () => {
      return { url: new URL("helloworld") };
    });
    this.pubsub.handleTell("setAppState", async (msg) => {
      this.appState = msg.appState;
    });
    this.pubsub.handleTell("setVideoState", async (msg) => {
      this.appState.PartyState.videoState = msg.videoState;
    });
    this.appState = InitialState;
    for (const stableWebsite of stableWebsites) {
      if (window.location.href.includes(stableWebsite)) {
        this.stableWebsite = true;
      }
    }
    if (["staging", "development"].includes(this.appState.RootState.appMode)) {
      log.enableAll();
    } else {
      log.setDefaultLevel("info");
    }
    log.info(
      `Jelly-Party: Debug logging is ${
        ["staging", "development"].includes(this.appState.RootState.appMode)
          ? "enabled"
          : "disabled"
      }.`
    );
    this.displayNotification("Jelly Party loaded!", true);
    this.attemptAutoJoin();
  }

  async getURL() {
    return await this.pubsub.ask("getURL", {});
  }

  async attemptAutoJoin() {
    const jellyPartyId = new URLSearchParams(
      (await this.getURL()).url.toString()
    ).get("jellyPartyId");
    if (jellyPartyId) {
      this.joinParty(jellyPartyId);
    } else {
      console.log("Jelly-Party: No partyId found from URL. Skipping AutoJoin.");
    }
  }

  async resetPartyState() {
    this.pubsub.tell("resetPartyState", {});
  }

  async updateMagicLink() {
    const { baseLink } = await this.pubsub.ask("getBaseLink", {});
    const magicLink = new URL("https://join.jelly-party.com/");
    const redirectURL = encodeURIComponent(baseLink);
    magicLink.searchParams.append("redirectURL", redirectURL);
    magicLink.searchParams.append(
      "jellyPartyId",
      this.appState.PartyState.partyId
    );
    this.appState.PartyState.magicLink = magicLink.toString();
  }

  locallySyncPartyState = async () => {
    try {
      // We craft a command to let the server know about our new client state
      const { videoState } = await this.getVideoState();
      this.appState.PartyState.videoState = videoState;
    } catch (error) {
      log.debug("Jelly-Party: Error updating client state..");
      log.error(error);
    }
  };

  startParty() {
    this.connectToPartyHelper();
  }

  joinParty(partyId: string) {
    this.connectToPartyHelper(partyId);
  }

  displayNotification(notificationText: string, forceDisplay = false) {
    if (forceDisplay || this.appState.OptionsState.statusNotificationsNotyf) {
      this.pubsub.tell("displayNotification", { text: notificationText });
    }
  }

  connectToPartyHelper(partyId = "") {
    this.pubsub.tell("connectToParty", { partyId: partyId });
  }

  sendChatMessage(text: string) {
    if (text.length > 0) {
      this.pubsub.tell("sendChatMessage", { text: text });
    } else {
      log.log(`Jelly-Party: Not sending empty chat message.`);
    }
  }

  async togglePlayPause() {
    this.pubsub.tell("togglePlayPause", {});
  }

  toggleFullScreen() {
    this.pubsub.tell("toggleFullscreen", {});
  }

  async getVideoState() {
    return await this.pubsub.ask("getVideoState", {});
  }
}

const app = new Vue({
  render: (h) => h(Sidebar),
}).$mount("#app");
const iframe = new IFrame();
app.$iframe = iframe;
