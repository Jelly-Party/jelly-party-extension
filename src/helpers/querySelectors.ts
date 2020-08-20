export function deepQuerySelectorAll(selector: string, baseDoc = document) {
  const elements: Array<Element> = [];
  baseDoc
    .querySelectorAll(selector)
    .forEach((elem: Element) => elements.push(elem));
  // Next, check nested iFrames
  baseDoc
    .querySelectorAll("iframe:not([id=jellyPartyRoot])")
    .forEach(iframe => {
      try {
        const nextDoc: Document = (iframe as HTMLIFrameElement).contentWindow
          ?.document as Document;
        elements.push(...deepQuerySelectorAll(selector, nextDoc));
      } catch {
        return;
      }
    });
  return elements;
}

export function querySelector(selector: string) {
  return (
    (document.querySelector(selector) as HTMLElement) ??
    (document.createElement("div") as HTMLElement)
  );
}

export function getReferenceToLargestVideo() {
  const videos = (deepQuerySelectorAll("video") as unknown) as Array<
    HTMLVideoElement
  >;
  const videoSizes = Array.from(videos).map(
    v => v.offsetHeight * v.offsetWidth,
  );
  const maxIndex = videoSizes.indexOf(Math.max(...videoSizes));
  return videos[maxIndex];
}

export async function timeoutQuerySelector(
  selector: string,
): Promise<HTMLIFrameElement | null> {
  let counter = 0;
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const elem: HTMLIFrameElement | null = document.querySelector(selector);
      if (elem) {
        clearInterval(interval);
        resolve(elem);
      }
      counter++;
      if (counter >= 100) {
        clearInterval(interval);
        reject("Jelly-Party: timeoutQuerySelector timed out!");
      }
    }, 200);
  });
}
