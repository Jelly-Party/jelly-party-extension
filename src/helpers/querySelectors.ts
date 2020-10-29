export function querySelector(selector: string) {
  return (
    (document.querySelector(selector) as HTMLElement) ??
    (document.createElement("div") as HTMLElement)
  );
}

export function getReferenceToLargestVideo(
  videos: NodeListOf<HTMLVideoElement>,
) {
  const videoSizes = Array.from(videos).map(
    v => v.offsetHeight * v.offsetWidth,
  );
  const maxIndex = videoSizes.indexOf(Math.max(...videoSizes));
  return videos[maxIndex];
}

export async function timeoutQuerySelectorAll(
  selector: string,
): Promise<NodeListOf<HTMLElement> | null> {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      const elem: NodeListOf<HTMLElement> | null = document.querySelectorAll(
        selector,
      );
      if (elem) {
        clearInterval(interval);
        resolve(elem);
      }
    }, 200);
  });
}

export function customQuerySelector(selector: string): HTMLElement {
  return document.querySelector(selector) ?? document.createElement("div");
}
