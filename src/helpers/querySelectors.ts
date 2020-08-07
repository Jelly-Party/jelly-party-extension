export function deepQuerySelectorAll(selector: string) {
  const elements: Array<Element> = [];
  document
    .querySelectorAll(selector)
    .forEach((elem: Element) => elements.push(elem));
  document.querySelectorAll("iframe").forEach(iframe => {
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
  return document.querySelector(selector) as HTMLElement;
}
