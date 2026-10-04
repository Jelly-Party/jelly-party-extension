import { reportInvite } from "../telemetry";
import "virtual:uno.css";
import { parseMagicLink } from "jelly-party-lib";
import "../sidebar/style.css";

const invite = parseMagicLink(location.href);
const tabId = Number.parseInt(new URLSearchParams(location.search).get("tab") ?? "", 10);
const allow = document.querySelector<HTMLButtonElement>("#allow")!;
const description = document.querySelector<HTMLElement>("#description")!;
const status = document.querySelector<HTMLElement>("#status")!;
let needsPermission = true;

if (!invite) {
  description.textContent = "This invite is incomplete or unsafe. Ask your friend for a new link.";
} else {
  void reportInvite(invite.partyId, "invite_opened");
  const { hostname } = new URL(invite.destination);
  void chrome.permissions.contains({ origins: [invite.originPattern] }).then((granted) => {
    needsPermission = !granted;
    if (!granted) void reportInvite(invite.partyId, "permission_required");
    description.textContent = granted
      ? `Open ${hostname} and join your friends in the Jelly Party sidebar.`
      : `Jelly Party needs access to ${hostname} to keep the video in sync with your friends.`;
    allow.textContent = granted ? "Open video and join" : "Allow and join";
    allow.disabled = false;
  });
}

allow.addEventListener("click", () => {
  if (!invite) return;
  allow.disabled = true;
  status.textContent = "Waiting for the browser…";
  // Start both gesture-gated operations directly from the extension-page click.
  // Firefox deliberately does not accept a click relayed from the public join site.
  const sidebarOpening = openJoinSidebar(tabId);
  const permissionRequest = needsPermission
    ? chrome.permissions.request({ origins: [invite.originPattern] })
    : Promise.resolve(true);
  void Promise.all([permissionRequest, sidebarOpening])
    .then(async ([granted, sidebarOpened]) => {
      void reportInvite(invite.partyId, granted ? "permission_granted" : "permission_denied");
      if (!granted) {
        allow.disabled = false;
        status.textContent = "Jelly Party needs that access to join the party.";
        return;
      }
      void reportInvite(invite.partyId, "join_attempt");
      status.textContent = "Opening the shared video…";
      await chrome.runtime.sendMessage({
        type: "join:granted",
        ...invite,
        tabId,
        sidebarOpened,
      });
    })
    .catch(() => {
      allow.disabled = false;
      status.textContent = "The browser did not answer. Please try again.";
    });
});

function openJoinSidebar(targetTabId: number): Promise<boolean> {
  if (chrome.sidePanel && Number.isInteger(targetTabId)) {
    return chrome.sidePanel.open({ tabId: targetTabId }).then(
      () => true,
      () => false,
    );
  }
  const firefox = globalThis as typeof globalThis & {
    browser?: { sidebarAction?: { open(): Promise<void> } };
  };
  return (
    firefox.browser?.sidebarAction
      ?.open()
      .then(() => true)
      .catch(() => false) ?? Promise.resolve(false)
  );
}
