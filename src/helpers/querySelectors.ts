export function deepQuerySelectorAll(selector: string) {
  const elements: Array<Element> = [];
  document
    .querySelectorAll(selector)
    .forEach((elem: Element) => elements.push(elem));
  document.querySelectorAll("iframe").forEach(iframe => {
    // Let's check that the iframe is same origin. Otherwise, this is a lost cause anyways.
    try {
      if (!(new URL(iframe.src).host === window.location.host)) {
        console.log("Jelly-Party: Not scanning cross-origin iFrame.");
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
