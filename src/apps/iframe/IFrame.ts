import Vue from "vue";
import Sidebar from "./views/Sidebar.vue";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import log from "loglevel";
import { AppStateInterface, InitialState } from "./store/store";
import { browser, Runtime } from "webextension-polyfill-ts";
import {
  JellyPartyDescriptor,
  JellyPartyProtocol,
} from "../../messaging/Protocol";
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

export let appState: AppStateInterface;

export class IFrame {
  messagingPort: Runtime.Port;
  stableWebsite!: boolean;
  pubsub: ProtoframePubsub<JellyPartyProtocol>;

  constructor() {
    this.messagingPort = browser.runtime.connect(undefined, { name: "iframe" });
    this.pubsub = ProtoframePubsub.build(
      JellyPartyDescriptor,
      this.messagingPort,
    );
    this.pubsub.handleTell("setAppState", async msg => {
      appState = msg.appState;
    });
    this.pubsub.handleTell("setVideoState", async msg => {
      appState.PartyState.videoState = msg.videoState;
    });
    appState = InitialState;
    if (["staging", "development"].includes(appState.RootState.appMode)) {
      log.enableAll();
    } else {
      log.setDefaultLevel("info");
    }
    log.info(
      `Jelly-Party: Debug logging is ${
        ["staging", "development"].includes(appState.RootState.appMode)
          ? "enabled"
          : "disabled"
      }.`,
    );
    this.displayNotification("Jelly Party loaded!", true);
  }

  async resetPartyState() {
    this.pubsub.tell("leaveParty", {});
  }

  startParty() {
    this.connectToPartyHelper();
  }

  joinParty(partyId: string) {
    this.connectToPartyHelper(partyId);
  }

  displayNotification(notificationText: string, forceDisplay = false) {
    if (forceDisplay || appState.OptionsState.statusNotificationsNotyf) {
      this.pubsub.tell("displayNotification", { text: notificationText });
    }
  }

  connectToPartyHelper(partyId = "") {
    this.pubsub.tell("joinParty", { partyId: partyId });
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
}

const app = new Vue({
  render: h => h(Sidebar),
}).$mount("#app");
const iframe = new IFrame();
app.$iframe = iframe;
