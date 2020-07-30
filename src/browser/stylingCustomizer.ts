import { sleep } from "@/helpers/sleep";
export default class {
  host: string;
  IFrameTarget!: HTMLElement;
  IFrameIdentifier!: string;

  constructor(host: string) {
    this.host = host;
    this.main();
  }

  async main() {
    await this.setIFrameTarget();
    console.log("Jelly-Party: Found IFrame Target!");
  }

  async setIFrameTarget() {
    this.setIFrameTargetIdentifier();
    if (!this.IFrameIdentifier) {
      this.IFrameTarget = document.body;
      return;
    }
    while (!this.IFrameTarget) {
      const target: HTMLElement | null = document.querySelector(
        this.IFrameIdentifier,
      );
      if (target) {
        this.IFrameTarget = target;
        return;
      }
      await sleep(250);
    }
  }

  setIFrameTargetIdentifier() {
    switch (this.host) {
      case "www.netflix.com": {
        this.IFrameIdentifier = ".sizing-wrapper";
        break;
      }
      case "www.disneyplus.com": {
        this.IFrameIdentifier = ".sizing-wrapper";
        break;
      }
      case "www.youtube.com": {
        this.IFrameIdentifier = ".sizing-wrapper";
        break;
      }
      case "vimeo.com": {
        this.IFrameIdentifier = ".sizing-wrapper";
        break;
      }
      default: {
        this.IFrameIdentifier = "";
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  fixWebsiteDisplay() {}
}
