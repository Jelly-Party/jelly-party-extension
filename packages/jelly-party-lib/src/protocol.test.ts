import { describe, expect, it } from "vite-plus/test";
import {
  MAX_CHAT_LENGTH,
  parseClientMessage,
  parsePartyId,
  type ClientMessage,
} from "./protocol.js";

const partyId = "a".repeat(64);

describe("party capability IDs", () => {
  it("accepts a 64-character Durable Object capability", () => {
    expect(parsePartyId(partyId)).toBe(partyId);
  });

  it.each(["", "short", `${partyId}=`, "A".repeat(64), "a".repeat(63), "a".repeat(65)])(
    "rejects %j",
    (value) => {
      expect(parsePartyId(value)).toBeNull();
    },
  );
});

describe("client protocol validation", () => {
  it("accepts a bounded join message", () => {
    const message: ClientMessage = {
      type: "join",
      peer: { id: "11111111-1111-4111-8111-111111111111", name: "Mira", emoji: "🪼" },
      destination: { url: "https://example.com/watch", title: "Friday night movie" },
    };

    expect(parseClientMessage(JSON.stringify(message))).toEqual({ ok: true, value: message });
  });

  it("validates optional reconnect credentials independently of the public peer", () => {
    const message = {
      type: "join",
      peer: { id: "11111111-1111-4111-8111-111111111111", name: "Mira", emoji: "🪼" },
      destination: { url: "https://example.com/watch", title: "Movie" },
      reconnectToken: crypto.randomUUID(),
    };
    expect(parseClientMessage(JSON.stringify(message))).toEqual({ ok: true, value: message });
    for (const reconnectToken of [null, 123, "", "x".repeat(1024)]) {
      expect(parseClientMessage(JSON.stringify({ ...message, reconnectToken })).ok).toBe(false);
    }
  });

  it("accepts bounded chat and finite playback messages", () => {
    expect(parseClientMessage(JSON.stringify({ type: "heartbeat" }))).toEqual({
      ok: true,
      value: { type: "heartbeat" },
    });
    expect(parseClientMessage(JSON.stringify({ type: "chat", text: "Hello!" }))).toEqual({
      ok: true,
      value: { type: "chat", text: "Hello!" },
    });
    expect(
      parseClientMessage(
        JSON.stringify({
          type: "playback",
          action: "seek",
          timeFromEnd: 12.5,
          destinationRevision: 2,
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        type: "playback",
        action: "seek",
        timeFromEnd: 12.5,
        destinationRevision: 2,
      },
    });
    expect(
      parseClientMessage(
        JSON.stringify({ type: "leader", peerId: "22222222-2222-4222-8222-222222222222" }),
      ),
    ).toEqual({
      ok: true,
      value: { type: "leader", peerId: "22222222-2222-4222-8222-222222222222" },
    });
    expect(
      parseClientMessage(
        JSON.stringify({
          type: "destination",
          destination: { url: "https://example.com/next", title: "Next video" },
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        type: "destination",
        destination: { url: "https://example.com/next", title: "Next video" },
      },
    });
  });

  it("accepts a positive history cursor", () => {
    expect(parseClientMessage(JSON.stringify({ type: "history", beforeId: 42 }))).toEqual({
      ok: true,
      value: { type: "history", beforeId: 42 },
    });
  });

  it.each([
    "not json",
    JSON.stringify({ type: "join", peer: { id: "x", name: "", emoji: "" } }),
    JSON.stringify({ type: "history", beforeId: 0 }),
    JSON.stringify({ type: "leader", peerId: "not-a-peer" }),
    JSON.stringify({ type: "chat", text: "x".repeat(MAX_CHAT_LENGTH + 1) }),
    JSON.stringify({
      type: "playback",
      action: "seek",
      timeFromEnd: Number.NaN,
      destinationRevision: 1,
    }),
    JSON.stringify({
      type: "playback",
      action: "rewind",
      timeFromEnd: 1,
      destinationRevision: 1,
    }),
    JSON.stringify({
      type: "destination",
      destination: { url: "javascript:alert(1)", title: "Bad" },
    }),
    JSON.stringify({ type: "unknown" }),
  ])("rejects malformed or unbounded input", (input) => {
    expect(parseClientMessage(input).ok).toBe(false);
  });
});
