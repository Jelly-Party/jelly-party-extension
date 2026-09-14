import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PARTY_HEARTBEAT_MS, PartySocket } from "./party-socket";

class FakeWebSocket extends EventTarget {
  static readonly OPEN = 1;
  static instances: FakeWebSocket[] = [];

  readonly sent: string[] = [];
  readyState = 0;

  constructor(readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  send(message: string): void {
    this.sent.push(message);
  }

  close(): void {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
}

describe("party socket", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps a quiet Manifest V3 connection active until it is closed", () => {
    const onMessage = vi.fn();
    const onError = vi.fn();
    const socket = new PartySocket("wss://meet.example", {
      onMessage,
      onOpen: vi.fn(),
      onClose: vi.fn(),
      onError,
    });
    socket.connect(
      "a".repeat(64),
      { id: "11111111-1111-4111-8111-111111111111", name: "Mira", emoji: "🪼" },
      { url: "https://example.com/watch", title: "Movie" },
    );
    const webSocket = FakeWebSocket.instances[0]!;
    webSocket.open();

    expect(webSocket.sent.map((message) => JSON.parse(message))).toEqual([
      {
        type: "join",
        peer: { id: "11111111-1111-4111-8111-111111111111", name: "Mira", emoji: "🪼" },
        destination: { url: "https://example.com/watch", title: "Movie" },
      },
    ]);

    vi.advanceTimersByTime(PARTY_HEARTBEAT_MS);
    expect(webSocket.sent.map((message) => JSON.parse(message)).at(-1)).toEqual({
      type: "heartbeat",
    });

    webSocket.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify({ type: "heartbeat-ack" }) }),
    );
    expect(onMessage).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    const presence = { type: "presence", peers: [], leaderId: "" };
    webSocket.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(presence) }));
    expect(onMessage).toHaveBeenCalledExactlyOnceWith(presence);

    socket.close();
    const messagesAtClose = webSocket.sent.length;
    vi.advanceTimersByTime(PARTY_HEARTBEAT_MS * 2);
    expect(webSocket.sent).toHaveLength(messagesAtClose);
  });
});
