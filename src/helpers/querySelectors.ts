export function deepQuerySelectorAll(selector: string) {
  const elements: Array<Element> = [];
  document
    .querySelectorAll(selector)
    .forEach((elem: Element) => elements.push(elem));
  document.querySelectorAll("iframe").forEach(iframe => {
    // Let's check that the iframe is same origin. Otherwise, this is a lost cause anyways.
    try {
      if (!(new URL(iframe.src).host === window.location.host)) {
        console.log("Jelly-Party: Skipping iFrame: No access.");
        return;
      }
    } catch {
      return;
    }
    const iframeElements = (iframe as HTMLIFrameElement).contentWindow?.document.querySelectorAll(
      selector,
    );
    if (iframeElements) {
      iframeElements.forEach((elem: Element) => {
        elements.push(elem);
      });
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
