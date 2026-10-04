import { expect, test } from "vite-plus/test";
import { isClientInfo } from "./analytics";
import { parseClientMessage } from "./protocol";

test("telemetry accepts only bounded client metadata and outcome codes", () => {
  expect(isClientInfo({ browser: "firefox", version: "2.4.0", source: "test" })).toBe(true);
  for (const bad of [
    null,
    { browser: "arbitrary user agent", version: "2.4.0", source: "test" },
    { browser: "chrome", version: "private@example.com", source: "production" },
    { browser: "chrome", version: "2.4.0", source: "secret" },
  ])
    expect(isClientInfo(bad)).toBe(false);
  expect(
    parseClientMessage(
      JSON.stringify({ type: "telemetry", outcome: "video_ready", privateText: "ignored" }),
    ),
  ).toEqual({ ok: true, value: { type: "telemetry", outcome: "video_ready" } });
  expect(
    parseClientMessage(JSON.stringify({ type: "telemetry", outcome: "custom private failure" })).ok,
  ).toBe(false);
  expect(
    parseClientMessage(
      JSON.stringify({ type: "sync-result", commandId: "private identifier", outcome: "applied" }),
    ).ok,
  ).toBe(false);
});
