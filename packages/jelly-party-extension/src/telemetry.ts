import type { ClientInfo, ClientOutcome } from "jelly-party-lib";
export function clientInfo(): ClientInfo {
  return {
    browser: navigator.userAgent.includes("Firefox/")
      ? "firefox"
      : navigator.userAgent.includes("Edg/")
        ? "edge"
        : "chrome",
    version: chrome.runtime.getManifest().version,
    source: __JELLY_TEST__ ? "test" : "production",
  };
}
export async function reportInvite(partyId: string, outcome: ClientOutcome): Promise<void> {
  try {
    const endpoint = new URL(__JELLY_WS_URL__);
    endpoint.protocol = endpoint.protocol === "wss:" ? "https:" : "http:";
    endpoint.pathname = `/party/${partyId}/telemetry`;
    await fetch(endpoint, {
      method: "POST",
      keepalive: true,
      body: JSON.stringify({ outcome, client: clientInfo() }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* Reporting must not interrupt joining. */
  }
}
