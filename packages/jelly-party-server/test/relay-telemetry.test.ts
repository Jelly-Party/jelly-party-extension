import { env, exports } from "cloudflare:workers";
import { expect, test } from "vite-plus/test";

test("invalid invite reports use a separate rate limit from party connections", async () => {
  const headers = { "CF-Connecting-IP": "192.0.2.1" };
  const invalidPartyId = env.PARTY_QUOTA.newUniqueId().toString();
  const report = () =>
    exports.default.fetch(`https://meet.jelly-party.com/party/${invalidPartyId}/telemetry`, {
      method: "POST",
      headers,
    });
  const statuses = [];
  for (let attempt = 0; attempt < 31; attempt++) {
    statuses.push((await report()).status);
  }
  expect(statuses).toEqual([...Array(30).fill(404), 429]);

  const partyId = env.PARTY.newUniqueId().toString();
  const connection = await exports.default.fetch(`https://meet.jelly-party.com/party/${partyId}`, {
    headers: { ...headers, Upgrade: "websocket" },
  });
  expect(connection.status).toBe(101);
  connection.webSocket!.accept();
  connection.webSocket!.close();
});
