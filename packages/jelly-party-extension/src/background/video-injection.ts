export type VideoControllerInjection = (allFrames: boolean) => Promise<void>;

/** Runs in the page's isolated world, which survives background worker restarts. */
export function setVideoScanId(scanId: string): void {
  const page = window as Window & { __jellyPartyVideoScanId?: string };
  const previous = page.__jellyPartyVideoScanId;
  const [previousSession, previousSequence] =
    typeof previous === "string" ? previous.split(":") : [];
  const [session, sequence] = scanId.split(":");
  // A fresh worker owns a fresh session; within it, delayed scans cannot undo a newer scan.
  if (session !== previousSession || Number(sequence) >= Number(previousSequence)) {
    page.__jellyPartyVideoScanId = scanId;
  }
}

/**
 * The main frame decides whether the tab is accessible. Chrome rejects an
 * all-frame injection when even one cross-origin frame is inaccessible, so an
 * optional embedded player must never hide a usable top-level video.
 */
export async function injectVideoController(inject: VideoControllerInjection): Promise<boolean> {
  try {
    await inject(false);
  } catch {
    return false;
  }

  try {
    await inject(true);
  } catch {
    // The main frame is already instrumented. Other frames are best-effort.
  }
  return true;
}
