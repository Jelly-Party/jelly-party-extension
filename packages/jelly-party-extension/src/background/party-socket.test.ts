import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  PARTY_HEARTBEAT_MS,
  PARTY_JOIN_TIMEOUT_MS,
  PARTY_MAX_RETRIES,
  PartySocket,
} from "./party-socket";
class FakeWebSocket extends EventTarget {
  static readonly OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readonly sent: string[] = [];
  readyState = 0;
  constructor(readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event("open"));
  }
  message(value: object) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(value) }));
  }
  send(message: string) {
    this.sent.push(message);
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
}
const peer = { id: "11111111-1111-4111-8111-111111111111", name: "Viewer", emoji: "🍿" };
const destination = { url: "https://example.com/watch", title: "Movie" };
const welcome = {
  type: "welcome",
  peerId: peer.id,
  destination: { ...destination, revision: 1 },
  history: { entries: [], hasMore: false },
  leaderId: peer.id,
};
function setup() {
  const handlers = {
    onMessage: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onError: vi.fn(),
    onConnecting: vi.fn(),
  };
  const client = new PartySocket("wss://meet.example", handlers);
  client.connect("a".repeat(64), peer, destination);
  return { client, handlers, socket: FakeWebSocket.instances.at(-1)! };
}
describe("party connection recovery", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("waits for welcome, keeps quiet connections alive, and stops on explicit leave", () => {
    const { client, handlers, socket } = setup();
    socket.open();
    expect(handlers.onOpen).not.toHaveBeenCalled();
    expect(client.chat("too early")).toBe(false);
    socket.message(welcome);
    expect(handlers.onOpen).toHaveBeenCalledOnce();
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(PARTY_HEARTBEAT_MS);
      expect(JSON.parse(socket.sent.at(-1)!)).toEqual({ type: "heartbeat" });
      socket.message({ type: "heartbeat-ack" });
    }
    expect(FakeWebSocket.instances).toHaveLength(1);
    client.close();
    vi.advanceTimersByTime(120000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(handlers.onError).not.toHaveBeenCalled();
  });
  it("recovers a half-open connection with the same identity and latest destination", () => {
    const { client, handlers, socket } = setup();
    socket.open();
    socket.message(welcome);
    const next = { url: "https://example.com/next", title: "Next", revision: 2 };
    socket.message({ type: "destination", peerId: peer.id, destination: next });
    vi.advanceTimersByTime(60000);
    expect(socket.readyState).toBe(3);
    expect(handlers.onClose).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    const replacement = FakeWebSocket.instances[1]!;
    replacement.open();
    expect(JSON.parse(replacement.sent[0]!)).toEqual({ type: "join", peer, destination: next });
    replacement.message({ ...welcome, destination: next });
    expect(JSON.parse(replacement.sent.at(-1)!)).toEqual({
      type: "telemetry",
      outcome: "connection_recovered",
    });
    socket.message({ type: "presence", peers: [], leaderId: "stale" });
    expect(handlers.onMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ leaderId: "stale" }),
    );
    client.close();
  });
  it("bounds retries when the server never welcomes the client", () => {
    const { client, handlers } = setup();
    for (let attempt = 0; attempt <= PARTY_MAX_RETRIES; attempt++) {
      FakeWebSocket.instances.at(-1)!.open();
      vi.advanceTimersByTime(PARTY_JOIN_TIMEOUT_MS);
      if (attempt < PARTY_MAX_RETRIES) vi.advanceTimersByTime(1000 * 2 ** attempt);
    }
    vi.advanceTimersByTime(600000);
    expect(FakeWebSocket.instances).toHaveLength(PARTY_MAX_RETRIES + 1);
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringContaining("press Retry"));
    client.close();
  });
  it("cancels a queued reconnect on leave and never retries policy closes", () => {
    const { client, socket } = setup();
    socket.close();
    client.close();
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    const second = setup();
    second.socket.dispatchEvent(new CloseEvent("close", { code: 1008 }));
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    second.client.close();
  });
});
