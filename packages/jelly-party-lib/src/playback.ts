import type { PlaybackAction, PlaybackSnapshot } from "./protocol.js";

export function timeFromEnd(duration: number, currentTime: number): number | null {
  if (!finiteDuration(duration) || !Number.isFinite(currentTime)) return null;
  return Math.max(0, duration - Math.max(0, currentTime));
}

export function targetTime(duration: number, positionFromEnd: number): number | null {
  if (!finiteDuration(duration) || !Number.isFinite(positionFromEnd)) return null;
  return Math.max(0, Math.min(duration, duration - Math.max(0, positionFromEnd)));
}

export function liveTimeFromEnd(
  snapshot: Pick<PlaybackSnapshot, "playing" | "timeFromEnd" | "updatedAt">,
  now = Date.now(),
): number {
  if (!snapshot.playing) return snapshot.timeFromEnd;
  const elapsedSeconds = Math.max(0, now - snapshot.updatedAt) / 1000;
  return Math.max(0, snapshot.timeFromEnd - elapsedSeconds);
}

export class RemoteEchoGuard {
  readonly #pending = new Map<PlaybackAction, number>();

  mark(...events: PlaybackAction[]): void {
    for (const event of events) this.#pending.set(event, (this.#pending.get(event) ?? 0) + 1);
  }

  consume(event: PlaybackAction): boolean {
    const count = this.#pending.get(event) ?? 0;
    if (count === 0) return false;
    if (count === 1) this.#pending.delete(event);
    else this.#pending.set(event, count - 1);
    return true;
  }
}

function finiteDuration(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

// Players may emit several seeked events for one remote seek.
export class RemoteSeekGuard {
  private target: number | null = null;
  private expires = 0;
  mark(target: number, now = Date.now()): void {
    this.target = target;
    this.expires = now + 2000;
  }
  consume(position: number, now = Date.now()): boolean {
    if (this.target === null) return false;
    if (now > this.expires || Math.abs(position - this.target) > 0.75) {
      this.target = null;
      return false;
    }
    return true;
  }
}
