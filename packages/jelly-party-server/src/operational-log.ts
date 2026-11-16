import { WorkerEntrypoint } from "cloudflare:workers";

type LogLevel = "info" | "warn";
type OperationalEvent = { event: string } & Record<string, string | number | undefined>;

export class OperationalLog extends WorkerEntrypoint {
  write(level: LogLevel, event: OperationalEvent): void {
    console[level](event);
  }
}

// A loopback RPC keeps the invite URL and Party object ID out of the log context.
export function logOperationalEvent(
  ctx: ExecutionContext | DurableObjectState,
  level: LogLevel,
  event: OperationalEvent,
): void {
  ctx.waitUntil(
    Promise.resolve()
      .then(() => ctx.exports.OperationalLog.write(level, event))
      .catch(() => {}),
  );
}
