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
