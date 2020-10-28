export function querySelector(selector: string) {
  return (
    (document.querySelector(selector) as HTMLElement) ??
    (document.createElement("div") as HTMLElement)
  );
}

export function getReferenceToLargestVideo() {
  const videos = document.querySelectorAll("video");
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
