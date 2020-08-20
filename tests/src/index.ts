//@ts-ignore
import puppeteer = require("puppeteer");
//@ts-ignore
import prompts = require("prompts");
import { config } from "../config";

const pathToExtension = "dist";
const pathToUblock = config.ublockPath;

interface Dictionary<T> {
  [Key: string]: T;
}

interface ProviderConfig {
  magicLink: string;
  setCookiesAtURL?: string;
  cookies?: any;
}

const providerConfigs: Dictionary<ProviderConfig> = {
  netflix: {
    magicLink:
      "https://join.jelly-party.com/?redirectURL=https%253A%252F%252Fwww.netflix.com%252Fwatch%252F80204865%253FtrackId%253D14170286%2526tctx%253D1%25252C0%25252C92e27003-6b57-4973-b937-dfd8fec88f16-886148430%25252Ca4764d81-a08c-4151-b6cc-5abf55366f17_7080660X3XX1597077054308%25252Ca4764d81-a08c-4151-b6cc-5abf55366f17_ROOT%25252C&jellyPartyId=interesting-areas-assure-precisely",
    setCookiesAtURL: "https://www.netflix.com/",
    cookies: config.cookies.netflix,
  },
  vimeo: {
    magicLink:
      "https://join.jelly-party.com/?redirectURL=https%253A%252F%252Fvimeo.com%252F10650175&jellyPartyId=parliamentary-mornings-betray-in",
  },
  youtube: {
    magicLink:
      "https://join.jelly-party.com/?redirectURL=https%253A%252F%252Fwww.youtube.com%252Fwatch%253Fv%253DdQw4w9WgXcQ&jellyPartyId=comprehensive-experiences-collaborate-ruthlessly",
  },
  disneyPlus: {
    magicLink:
      "https://join.jelly-party.com/?redirectURL=https%253A%252F%252Fwww.disneyplus.com%252Fde-de%252Fvideo%252F862ae7df-229e-4c0d-aa1c-a7c006bea001&jellyPartyId=symbolic-arrangements-chop-critically",
    setCookiesAtURL: "https://www.disneyplus.com",
    cookies: config.cookies.disneyPlus,
  },
  primevideo: {
    magicLink:
      "https://join.jelly-party.com/?redirectURL=https%253A%252F%252Fwww.amazon.de%252FAmazon-Video%252Fb%252F%253Fnode%253D3010075031%2526ref%253Ddvm_MLP_ROWEU_DE_1&jellyPartyId=incredible-satisfactions-explode-maybe",
    setCookiesAtURL: "https://www.amazon.de",
    cookies: config.cookies.amazon,
  },
};

(async () => {
  // First, let the user choose providers
  const selectedProviders: number[] = (
    await prompts({
      type: "text",
      name: "value",
      message: `
      Please select the providers you would like to test.
      1) Netflix
      2) Vimeo
      3) Youtube
      4) Disney+
      5) Amazon Prime Video
      `,
    })
  )["value"]
    .split(",")
    .map((val: string) => parseInt(val));
  let counter = 0;
  for (const [providerName, providerConfig] of Object.entries(
    providerConfigs,
  )) {
    counter++;
    if (!selectedProviders.includes(counter)) {
      // Skip provider if not selected
      continue;
    }
    const browserClosedPromises: Promise<any>[] = [];
    console.log(`Moving to ${providerName}`);
    for (let i = 0; i < 2; i++) {
      const browser = await puppeteer.launch({
        headless: false,
        args: [
          `--disable-extensions-except=${pathToExtension}${
            pathToUblock ? `,${pathToUblock}` : ""
          }`,
          `--load-extension=${pathToExtension}${
            pathToUblock ? `,${pathToUblock}` : ""
          }`,
          "--enable-webgl-draft-extensions",
          "--enable-webgl-image-chromium",
          "--enable-webgl-swap-chain",
          "--enable-webgl2-compute-context",
          "--enable-direct-composition-video-overlays",
          "--enable-gpu-memory-buffer-video-frames",
          "--video-threads 8",
        ],
        defaultViewport: { width: 1200, height: 1200 },
        executablePath: config.chromePath,
      });
      const browserClosedPromise = new Promise((resolve, reject) => {
        browser.on("disconnected", () => {
          console.log("Browser being closed.");
          resolve("Browser closed.");
        });
      });
      console.log(browserClosedPromise);
      browserClosedPromises.push(browserClosedPromise);
      const pages = await browser.pages();
      if (providerConfig.cookies && providerConfig.setCookiesAtURL) {
        await pages[0].goto(providerConfig.setCookiesAtURL);
        for (const cookie of providerConfig.cookies) {
          try {
            await pages[0].setCookie(cookie);
            console.log("Setting cookie:");
            console.log(cookie);
          } catch {
            console.error(`Skipping cookie:`);
            console.log(cookie);
          }
        }
      }
      await pages[0].goto(providerConfig.magicLink);
    }
    await Promise.all(browserClosedPromises);
  }
})();
