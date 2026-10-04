import { clientInfo } from "../telemetry";
import {
  buildMagicLink,
  getRandomEmoji,
  isPlaybackAction,
  liveTimeFromEnd,
  type MagicLink,
  MAX_CHAT_LENGTH,
  MAX_EMOJI_LENGTH,
  MAX_NAME_LENGTH,
  parseMagicLink,
  parsePartyId,
  type PartyDestination,
  type PeerIdentity,
  type PlaybackAction,
  type ServerMessage,
} from "jelly-party-lib";
import { PartySocket } from "./party-socket";
import { requestPartyId } from "./party-api";
import {
  initialPartyState,
  reducePartyState,
  type PartyState,
  type PartyStateEvent,
} from "./party-state";
import { injectVideoController } from "./video-injection";

interface VideoCandidate {
  frameId: number;
  area: number;
  score: number;
  hasVideo: boolean;
  canSync: boolean;
  scanId: number;
}

interface PendingJoin {
  partyId: string;
  destination: string;
}

interface RemotePlaybackTarget {
  commandId?: string;
  action: PlaybackAction;
  timeFromEnd: number;
  updatedAt: number;
}

type PlaybackResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      reason?: "interaction-required" | "video-unavailable";
    };

const candidates = new Map<number, Map<number, VideoCandidate>>();
const activeVideoScans = new Map<number, number>();
const frameScanTimers = new Map<number, ReturnType<typeof setTimeout>>();
const navigationScanTimers = new Map<number, ReturnType<typeof setTimeout>>();
const openSidePanelTabs = new Set<number>();
const openSidePanelWindows = new Set<number>();
const adjectives = ["Bright", "Calm", "Happy", "Kind", "Lucky", "Swift"];
const animals = ["Fox", "Jellyfish", "Otter", "Owl", "Panda", "Whale"];

let partyState: PartyState = initialPartyState;
let partySocket: PartySocket | null = null;
let playbackTarget: RemotePlaybackTarget | null = null;
let retriedPlaybackTarget: RemotePlaybackTarget | null = null;
let pendingLeaderDestination = "";
let leaderDestinationTimer: ReturnType<typeof setTimeout> | null = null;
let scheduledLeaderDestination = "";
let nextVideoScanId = 1;
let activityTimer: ReturnType<typeof setTimeout> | null = null;
let nextActivityId = 1;
let suppressPlaybackActivityRevision: number | null = null;

if (chrome.sidePanel) {
  // Own the toolbar click so Chrome grants activeTab before we scan the page.
  // Native side-panel toggling consumes that click without dispatching action.onClicked.
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined);
  chrome.sidePanel.onOpened.addListener(({ tabId, windowId }) => {
    if (tabId === undefined) openSidePanelWindows.add(windowId);
    else openSidePanelTabs.add(tabId);
  });
  chromeSidePanel().onClosed?.addListener(({ tabId, windowId }) => {
    if (tabId === undefined) openSidePanelWindows.delete(windowId);
    else openSidePanelTabs.delete(tabId);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureIdentity();
});

chrome.action.onClicked.addListener((tab) => {
  // Both APIs are gesture-gated, so invoke them directly in the click handler.
  if (chrome.sidePanel) handleChromeActionClick(tab);
  else {
    void toggleFirefoxSidebar();
    void handleActionClick(tab);
  }
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void notifyViews({ type: "tab:activated", tabId, windowId });
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && partyState.kind === "active") void disablePartyPanel(tab.id);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  invalidateVideoScan(tabId);
  clearScheduledTabScan(navigationScanTimers, tabId);
  openSidePanelTabs.delete(tabId);
  if (partyState.kind === "active" && partyState.party.tabId === tabId) {
    stopParty({ type: "tab-removed", tabId });
  }
});

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  void handleTabUpdate(tabId, change, tab);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (!isRecord(message) || typeof message.type !== "string") return undefined;

  if (message.type === "identity:get") return ensureIdentity();

  if (message.type === "identity:set") {
    const current = await ensureIdentity();
    const identity: PeerIdentity = {
      id: current.id,
      name: bounded(message.name, MAX_NAME_LENGTH) ?? current.name,
      emoji: bounded(message.emoji, MAX_EMOJI_LENGTH) ?? current.emoji,
    };
    await chrome.storage.local.set({ identity });
    return identity;
  }

  if (message.type === "party:state") return partyState;

  if (message.type === "party:create" && typeof message.tabId === "number") {
    const tab = await chrome.tabs.get(message.tabId);
    await scanTab(message.tabId);
    if (!tab.url?.startsWith("http") || !bestCandidate(message.tabId)) {
      return { ok: false, error: "Open a page with a video before starting a party." };
    }
    const identity = await ensureIdentity();
    try {
      startParty(await requestPartyId(__JELLY_PARTY_CREATION_URL__), tab, identity);
      return { ok: true, state: partyState };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not create a party. Try again.",
      };
    }
  }

  if (message.type === "party:leave") {
    leaveParty();
    return { ok: true };
  }

  if (message.type === "party:retry") {
    if (partyState.kind === "idle") return { ok: false, error: "There is no party to retry." };
    const identity = await ensureIdentity();
    connectParty(partyState.party.partyId, identity);
    return { ok: true };
  }

  if (message.type === "party:chat") {
    const text = bounded(message.text, MAX_CHAT_LENGTH);
    if (!text || partyState.kind === "idle") return { ok: false };
    return partySocket?.chat(text)
      ? { ok: true }
      : { ok: false, error: "Reconnect before sending your message." };
  }

  if (message.type === "party:history" && typeof message.beforeId === "number") {
    if (partyState.kind === "idle") return { ok: false };
    partySocket?.history(message.beforeId);
    return { ok: true };
  }

  if (message.type === "party:leader" && typeof message.peerId === "string") {
    if (
      partyState.kind === "idle" ||
      partyState.party.selfId !== partyState.party.leaderId ||
      !partyState.party.peers.some((peer) => peer.id === message.peerId)
    ) {
      return { ok: false, error: "Only the leader can hand the party to someone who is here." };
    }
    return partySocket?.leader(message.peerId)
      ? { ok: true }
      : { ok: false, error: "Reconnect before changing the leader." };
  }

  if (message.type === "party:focus") {
    return focusParty();
  }

  if (message.type === "party:return-video") {
    return returnToPartyVideo();
  }

  if (message.type === "tab:snapshot") {
    const tab =
      typeof message.tabId === "number"
        ? await chrome.tabs.get(message.tabId)
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.id) return { error: "Open a video tab first" };
    const accessGranted = await scanTab(tab.id);
    return {
      tabId: tab.id,
      windowId: tab.windowId,
      url: tab.url,
      title: tab.title,
      video: videoScan(tab.id, accessGranted),
    };
  }

  if (message.type === "video:frame-status" && sender.tab?.id && sender.frameId !== undefined) {
    const scanId = activeVideoScans.get(sender.tab.id);
    if (typeof message.scanId !== "number" || message.scanId !== scanId) return undefined;
    const frames = candidates.get(sender.tab.id) ?? new Map<number, VideoCandidate>();
    const wasSyncable = bestCandidate(sender.tab.id)?.canSync === true;
    frames.set(sender.frameId, {
      frameId: sender.frameId,
      area: typeof message.area === "number" ? message.area : 0,
      score: typeof message.score === "number" ? message.score : 0,
      hasVideo: message.hasVideo === true,
      canSync: message.canSync === true,
      scanId,
    });
    candidates.set(sender.tab.id, frames);
    const hasVideo = Boolean(bestCandidate(sender.tab.id)?.hasVideo);
    if (partyState.kind === "active" && partyState.party.tabId === sender.tab.id) {
      const becameAvailable =
        partyState.party.atDestination && hasVideo && !partyState.party.hasVideo;
      const becameSyncable = !wasSyncable && bestCandidate(sender.tab.id)?.canSync === true;
      const partyId = partyState.party.partyId;
      transition({
        type: "video",
        hasVideo: partyState.party.atDestination && hasVideo,
        accessRequired: false,
      });
      if ((becameAvailable || becameSyncable) && playbackTarget) {
        void applyLatestRemotePlayback(partyId);
      }
      partySocket?.telemetry(hasVideo ? "video_ready" : "video_missing");
      if (hasVideo) void maybePublishLeaderDestination(sender.tab.id);
    }
    await notifyViews({ type: "video:status", tabId: sender.tab.id, hasVideo });
    return undefined;
  }

  if (message.type === "video:local" && sender.tab?.id && sender.frameId !== undefined) {
    if (message.scanId !== activeVideoScans.get(sender.tab.id)) return undefined;
    const best = bestCandidate(sender.tab.id);
    if (
      best?.frameId === sender.frameId &&
      partyState.kind === "active" &&
      partyState.party.tabId === sender.tab.id &&
      partyState.party.atDestination &&
      isPlaybackAction(message.action) &&
      typeof message.timeFromEnd === "number"
    ) {
      if (message.action === "play" && partyState.party.playbackBlocked && playbackTarget) {
        transition({ type: "playback-blocked", blocked: false });
        void applyLatestRemotePlayback(partyState.party.partyId);
      } else {
        rememberPlaybackTarget(message.action, message.timeFromEnd);
        partySocket?.playback(
          message.action,
          message.timeFromEnd,
          partyState.party.destinationRevision,
        );
      }
    }
    return undefined;
  }

  if (
    message.type === "video:frames-changed" &&
    sender.tab?.id &&
    sender.frameId === 0 &&
    message.scanId === activeVideoScans.get(sender.tab.id)
  ) {
    scheduleFrameScan(sender.tab.id);
    return undefined;
  }

  if (
    message.type === "video:apply" &&
    typeof message.tabId === "number" &&
    isPlaybackAction(message.action) &&
    typeof message.timeFromEnd === "number"
  ) {
    return applyPlayback(message.tabId, message.action, message.timeFromEnd);
  }

  if (message.type === "pending:consume" && typeof message.tabId === "number") {
    return consumePendingJoin(message.tabId);
  }

  if (
    message.type === "join:granted" &&
    parsePartyId(message.partyId) &&
    typeof message.destination === "string" &&
    typeof message.tabId === "number"
  ) {
    return completeGrantedJoin(
      parsePartyId(message.partyId)!,
      message.destination,
      message.tabId,
      message.sidebarOpened === true,
    );
  }

  if (
    message.type === "join:prepare" &&
    sender.tab?.id &&
    parsePartyId(message.partyId) &&
    typeof message.destination === "string" &&
    typeof message.originPattern === "string"
  ) {
    if (partyState.kind === "active") {
      await focusParty();
      return {
        ok: false,
        error: "You’re already in a party. Leave it before joining another one.",
      };
    }
    const partyId = parsePartyId(message.partyId)!;
    const invite = inviteFromParts(__JELLY_JOIN_URL__, partyId, message.destination);
    if (!invite || invite.originPattern !== message.originPattern) {
      return { ok: false, error: "Invalid invite link" };
    }
    await preparePartySidebar(sender.tab.id);
    await openGrantPage({ partyId, destination: invite.destination }, sender.tab.id);
    return { ok: true };
  }

  return undefined;
}

/**
 * Keep the permission hand-off in the invite's tab. The extension page has the
 * permission API, and its button supplies the user gesture both browsers require.
 */
async function openGrantPage(pending: PendingJoin, tabId: number): Promise<void> {
  const grantPage = chrome.runtime.getURL("src/grant/grant.html");
  const link = new URL(buildMagicLink(grantPage, pending.partyId, pending.destination));
  link.searchParams.set("tab", String(tabId));
  await chrome.tabs.update(tabId, { url: link.toString() });
}

/** Re-validates a destination a content script sent by round-tripping it through an invite. */
function inviteFromParts(joinUrl: string, partyId: string, destination: string): MagicLink | null {
  try {
    return parseMagicLink(buildMagicLink(joinUrl, partyId, destination));
  } catch {
    return null;
  }
}

async function completeGrantedJoin(
  partyId: string,
  destination: string,
  tabId: number,
  sidebarOpened: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const invite = inviteFromParts(__JELLY_JOIN_URL__, partyId, destination);
  if (!invite) return { ok: false, error: "Invalid invite link" };
  // Trust the browser, not the message: the page could only have been opened by us,
  // but the permission still has to be real before we send anyone to the video.
  if (!(await chrome.permissions.contains({ origins: [invite.originPattern] }))) {
    return { ok: false, error: "Site access was not granted" };
  }
  const pendingJoin: PendingJoin = { partyId, destination: invite.destination };
  await chrome.storage.local.set({ pendingJoin });
  if (!sidebarOpened) await markToolbarJoin(tabId);
  try {
    const tab = await chrome.tabs.update(tabId, { url: invite.destination, active: true });
    if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
  } catch {
    await chrome.tabs.create({ url: invite.destination });
  }
  return { ok: true };
}

async function handleActionClick(tab: chrome.tabs.Tab): Promise<void> {
  if (partyState.kind === "active") {
    if (tab.id !== partyState.party.tabId) {
      await focusParty(false);
    } else if (tab.id) {
      // A toolbar click renews activeTab after a cross-origin navigation.
      // Use that gesture to restore discovery on the existing party tab.
      await scanTab(tab.id);
    }
    return;
  }
  if (!tab.id) return;
  await scanTab(tab.id);
}

function handleChromeActionClick(tab: chrome.tabs.Tab): void {
  if (!tab.id) return;

  if (partyState.kind === "active" && tab.id !== partyState.party.tabId) {
    // open() must run before focusParty awaits anything or Chrome drops the gesture.
    void chrome.sidePanel.open({ tabId: partyState.party.tabId }).catch(() => undefined);
    void focusParty(false);
    return;
  }

  // Scan before toggling. Even when this click closes an existing panel, it
  // grants the fresh activeTab access needed after navigation.
  void handleActionClick(tab);
  const panelOpen = openSidePanelTabs.has(tab.id) || openSidePanelWindows.has(tab.windowId);
  if (panelOpen) {
    void closeChromeSidePanel(tab);
    return;
  }

  void chrome.sidePanel.open({ tabId: tab.id }).catch(() => undefined);
}

async function closeChromeSidePanel(tab: chrome.tabs.Tab): Promise<void> {
  const sidePanel = chromeSidePanel();
  if (!sidePanel.close || !tab.id) return;

  const options: chrome.sidePanel.CloseOptions = openSidePanelTabs.has(tab.id)
    ? { tabId: tab.id }
    : { windowId: tab.windowId };
  openSidePanelTabs.delete(tab.id);
  openSidePanelWindows.delete(tab.windowId);
  await sidePanel.close(options).catch(() => undefined);
}

function startParty(partyId: string, tab: chrome.tabs.Tab, identity: PeerIdentity): void {
  if (!tab.id || !tab.url) return;
  partySocket?.close();
  playbackTarget = null;
  retriedPlaybackTarget = null;
  transition({
    type: "started",
    partyId,
    tabId: tab.id,
    tabUrl: tab.url,
    tabTitle: tab.title ?? "Current video",
    selfId: identity.id,
    hasVideo: Boolean(bestCandidate(tab.id)),
  });
  void openPartySidebar(tab.id);
  void constrainPartyPanelTo(tab.id);
  void markPartyActive();
  connectParty(partyId, identity);
}

function connectParty(partyId: string, identity: PeerIdentity): void {
  if (partyState.kind === "idle" || partyState.party.partyId !== partyId) return;
  partySocket?.close();
  transition({ type: "connection", status: "connecting" });
  partySocket = new PartySocket(__JELLY_WS_URL__, {
    onConnecting: () => transitionIfCurrent(partyId, { type: "connection", status: "connecting" }),
    onOpen: () => transitionIfCurrent(partyId, { type: "connection", status: "connected" }),
    onClose: () => transitionIfCurrent(partyId, { type: "connection", status: "disconnected" }),
    onError: (notice) => transitionIfCurrent(partyId, { type: "notice", notice }),
    onMessage: (message) => handlePartyMessage(partyId, message),
  });
  partySocket.connect(
    partyId,
    identity,
    {
      url: partyState.party.tabUrl,
      title: partyState.party.tabTitle,
    },
    clientInfo(),
  );
}

function handlePartyMessage(partyId: string, message: ServerMessage): void {
  if (partyState.kind === "idle" || partyState.party.partyId !== partyId) return;
  if (message.type === "welcome") {
    partySocket?.telemetry(
      partyState.party.accessRequired
        ? "permission_required"
        : partyState.party.hasVideo
          ? "video_ready"
          : "video_missing",
    );
    const currentUrl = partyState.party.atDestination ? partyState.party.tabUrl : "";
    transition({
      type: "session",
      selfId: message.peerId,
      leaderId: message.leaderId,
      destination: message.destination,
      atDestination: samePartyDestination(currentUrl, message.destination.url),
    });
    transition({
      type: "history",
      entries: message.history.entries,
      hasMore: message.history.hasMore,
    });
    void followDestination(partyId, message.destination).then(() => {
      if (
        partyState.kind === "idle" ||
        partyState.party.partyId !== partyId ||
        message.playback?.destinationRevision !== partyState.party.destinationRevision
      ) {
        if (
          partyState.kind === "active" &&
          partyState.party.partyId === partyId &&
          partyState.party.selfId === partyState.party.leaderId &&
          message.initializePlayback !== false
        ) {
          void publishPlaybackSnapshot(partyId);
        }
        return;
      }
      const action = message.playback.playing ? "play" : "pause";
      playbackTarget = {
        action,
        timeFromEnd: message.playback.timeFromEnd,
        updatedAt: message.playback.updatedAt,
      };
      void applyLatestRemotePlayback(partyId);
    });
    return;
  }
  if (message.type === "presence") {
    const previousLeader = partyState.party.leaderId;
    transition({ type: "presence", peers: message.peers, leaderId: message.leaderId });
    if (previousLeader && previousLeader !== message.leaderId) {
      showActivity(message.leaderId, "is now leading the party");
    }
  }
  if (message.type === "chat") {
    transition({
      type: "chat",
      entry: message.entry,
    });
  }
  if (message.type === "history") {
    transition({
      type: "history",
      entries: message.history.entries,
      hasMore: message.history.hasMore,
    });
  }
  if (message.type === "destination") {
    cancelLeaderDestinationSchedule();
    pendingLeaderDestination = "";
    playbackTarget = null;
    retriedPlaybackTarget = null;
    suppressPlaybackActivityRevision =
      message.peerId === partyState.party.selfId ? null : message.destination.revision;
    if (message.peerId !== partyState.party.selfId)
      showActivity(message.peerId, "changed the video");
    void followDestination(partyId, message.destination).then(() => {
      if (
        partyState.kind === "active" &&
        partyState.party.partyId === partyId &&
        partyState.party.selfId === partyState.party.leaderId
      ) {
        void publishPlaybackSnapshot(partyId);
      }
    });
  }
  if (message.type === "playback") {
    if (message.destinationRevision !== partyState.party.destinationRevision) return;
    const previousAction = playbackTarget?.action;
    playbackTarget = {
      commandId: message.commandId,
      action:
        message.action === "seek" && previousAction && previousAction !== "seek"
          ? previousAction
          : message.action,
      timeFromEnd: message.timeFromEnd,
      updatedAt: Date.now(),
    };
    if (suppressPlaybackActivityRevision === message.destinationRevision) {
      suppressPlaybackActivityRevision = null;
    } else {
      showActivity(
        message.peerId,
        message.action === "play"
          ? "resumed the video"
          : message.action === "pause"
            ? "paused the video"
            : "seeked the video",
      );
    }
    void applyLatestRemotePlayback(partyId);
  }
  if (message.type === "error") transition({ type: "notice", notice: message.message });
}

async function publishPlaybackSnapshot(partyId: string): Promise<void> {
  if (partyState.kind === "idle" || partyState.party.partyId !== partyId) return;
  const { tabId } = partyState.party;
  const best = bestCandidate(tabId);
  if (!best) return;
  try {
    const result = await chrome.tabs.sendMessage(
      tabId,
      { type: "video:snapshot" },
      { frameId: best.frameId },
    );
    if (
      partyState.kind === "active" &&
      partyState.party.partyId === partyId &&
      result?.ok === true &&
      isPlaybackAction(result.action) &&
      typeof result.timeFromEnd === "number" &&
      Number.isFinite(result.timeFromEnd)
    ) {
      rememberPlaybackTarget(result.action, result.timeFromEnd);
      partySocket?.playback(
        result.action,
        result.timeFromEnd,
        partyState.party.destinationRevision,
      );
    }
  } catch {
    // A later local playback event can still establish state if the page changes
    // while the initial snapshot is being collected.
  }
}

async function followDestination(partyId: string, destination: PartyDestination): Promise<void> {
  if (partyState.kind === "idle" || partyState.party.partyId !== partyId) return;
  const tabId = partyState.party.tabId;
  try {
    const tab = await chrome.tabs.get(tabId);
    const atDestination = Boolean(tab.url && samePartyDestination(tab.url, destination.url));
    transition({ type: "destination", destination, atDestination });
    if (atDestination) {
      await scanTab(tabId);
      return;
    }
    candidates.delete(tabId);
    await chrome.tabs.update(tabId, { url: destination.url, active: true });
  } catch {
    leaveParty();
  }
}

async function maybePublishLeaderDestination(
  tabId: number,
  knownTab?: chrome.tabs.Tab,
): Promise<void> {
  const candidate = bestCandidate(tabId);
  if (
    partyState.kind === "idle" ||
    partyState.party.tabId !== tabId ||
    partyState.party.selfId !== partyState.party.leaderId ||
    partyState.party.status !== "connected" ||
    !candidate?.canSync
  ) {
    return;
  }
  const tab = knownTab ?? (await chrome.tabs.get(tabId));
  if (
    !tab.url?.startsWith("http") ||
    samePartyDestination(tab.url, partyState.party.tabUrl) ||
    samePartyDestination(tab.url, pendingLeaderDestination)
  ) {
    return;
  }
  if (samePartyDestination(tab.url, scheduledLeaderDestination)) return;
  cancelLeaderDestinationSchedule();
  scheduledLeaderDestination = tab.url;
  leaderDestinationTimer = setTimeout(() => {
    const destination = scheduledLeaderDestination;
    leaderDestinationTimer = null;
    scheduledLeaderDestination = "";
    void publishLeaderDestination(tabId, destination);
  }, 600);
}

async function publishLeaderDestination(tabId: number, expectedUrl: string): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const candidate = bestCandidate(tabId);
    if (
      partyState.kind === "idle" ||
      partyState.party.tabId !== tabId ||
      partyState.party.selfId !== partyState.party.leaderId ||
      partyState.party.status !== "connected" ||
      !candidate?.canSync ||
      candidate.scanId !== activeVideoScans.get(tabId) ||
      !tab.url ||
      !samePartyDestination(tab.url, expectedUrl) ||
      samePartyDestination(tab.url, partyState.party.tabUrl) ||
      samePartyDestination(tab.url, pendingLeaderDestination)
    ) {
      return;
    }
    const destination = {
      url: tab.url,
      title: (tab.title?.trim() || "Current video").slice(0, 200),
    };
    if (partySocket?.destination(destination)) pendingLeaderDestination = destination.url;
  } catch {
    // The tab may have navigated or closed while its video metadata settled.
  }
}

function cancelLeaderDestinationSchedule(): void {
  if (leaderDestinationTimer) clearTimeout(leaderDestinationTimer);
  leaderDestinationTimer = null;
  scheduledLeaderDestination = "";
}

function showActivity(peerId: string, action: string): void {
  if (partyState.kind === "idle") return;
  const peer = partyState.party.peers.find((candidate) => candidate.id === peerId);
  const activity = {
    id: nextActivityId++,
    text: `${peer?.emoji ?? "👤"} ${peer?.name ?? "Someone"} ${action}`,
  };
  transition({ type: "activity", activity });
  if (activityTimer) clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    if (partyState.kind === "active" && partyState.party.activity?.id === activity.id) {
      transition({ type: "activity", activity: null });
    }
  }, 2500);
}

async function applyPlayback(
  tabId: number,
  action: PlaybackAction,
  timeFromEnd: number,
): Promise<PlaybackResult> {
  if (
    partyState.kind === "active" &&
    partyState.party.tabId === tabId &&
    !partyState.party.atDestination
  ) {
    return {
      ok: false,
      error: "Return to the party video to resume synchronization.",
      reason: "video-unavailable",
    };
  }
  const best = bestCandidate(tabId);
  if (!best)
    return {
      ok: false,
      error: "The video is no longer available.",
      reason: "video-unavailable",
    };
  try {
    const result = await chrome.tabs.sendMessage(
      tabId,
      { type: "video:apply", action, timeFromEnd },
      { frameId: best.frameId },
    );
    if (result?.ok === true) return { ok: true };
    return {
      ok: false,
      error: result?.error ?? "The video controller is not ready yet.",
      reason: result?.reason ?? "video-unavailable",
    };
  } catch {
    return {
      ok: false,
      error: "The video controller is not ready yet.",
      reason: "video-unavailable",
    };
  }
}

function leaveParty(): void {
  stopParty({ type: "left" });
}

function stopParty(event: Extract<PartyStateEvent, { type: "left" | "tab-removed" }>): void {
  partySocket?.close();
  partySocket = null;
  playbackTarget = null;
  retriedPlaybackTarget = null;
  suppressPlaybackActivityRevision = null;
  pendingLeaderDestination = "";
  cancelLeaderDestinationSchedule();
  if (activityTimer) clearTimeout(activityTimer);
  activityTimer = null;
  transition(event);
  void chrome.action.setBadgeText({ text: "" });
  void chrome.action.setTitle({ title: "Open Jelly Party" });
  void restorePartyPanels();
}

async function returnToPartyVideo(): Promise<{ ok: boolean; error?: string }> {
  if (partyState.kind === "idle") return { ok: false, error: "There is no active party." };
  const { tabId, tabUrl } = partyState.party;
  try {
    cancelLeaderDestinationSchedule();
    pendingLeaderDestination = "";
    const tab = await chrome.tabs.update(tabId, { url: tabUrl, active: true });
    if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
    return { ok: true };
  } catch {
    leaveParty();
    return { ok: false, error: "The party tab is no longer open." };
  }
}

async function focusParty(openSidebar = true): Promise<{ ok: boolean; error?: string }> {
  if (partyState.kind === "idle") return { ok: false, error: "There is no active party." };
  try {
    const tab = await chrome.tabs.get(partyState.party.tabId);
    if (!tab.id) return { ok: false, error: "The party tab is no longer open." };
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    if (openSidebar) await openPartySidebar(tab.id);
    return { ok: true };
  } catch {
    leaveParty();
    return { ok: false, error: "The party tab is no longer open." };
  }
}

async function consumePendingJoin(tabId: number): Promise<PendingJoin | null> {
  const stored = await chrome.storage.local.get("pendingJoin");
  const pending = stored.pendingJoin as PendingJoin | undefined;
  if (!pending) return null;
  const tab = await chrome.tabs.get(tabId);
  if (!sameDestination(tab.url, pending.destination)) return null;
  await chrome.storage.local.remove("pendingJoin");
  await chrome.action.setBadgeText({ tabId, text: "" });
  await scanTab(tabId);
  startParty(pending.partyId, tab, await ensureIdentity());
  return pending;
}

function transition(event: PartyStateEvent): void {
  partyState = reducePartyState(partyState, event);
  void notifyViews({ type: "party:state", state: partyState });
}

function transitionIfCurrent(partyId: string, event: PartyStateEvent): void {
  if (partyState.kind === "active" && partyState.party.partyId === partyId) transition(event);
}

async function scanTab(tabId: number): Promise<boolean> {
  const scanId = activeVideoScans.get(tabId) ?? nextVideoScanId++;
  activeVideoScans.set(tabId, scanId);
  const accessGranted = await injectVideoController(async (allFrames) => {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames },
      func: (currentScanId) => {
        const page = window as Window & { __jellyPartyVideoScanId?: number };
        page.__jellyPartyVideoScanId = Math.max(page.__jellyPartyVideoScanId ?? 0, currentScanId);
      },
      args: [scanId],
    });
    await chrome.scripting.executeScript({
      target: { tabId, allFrames },
      files: ["src/content/video.js"],
    });
  });
  if (activeVideoScans.get(tabId) !== scanId) return accessGranted;
  if (accessGranted) {
    await chrome.tabs.sendMessage(tabId, { type: "video:refresh" }).catch(() => undefined);
  }
  if (!accessGranted) {
    activeVideoScans.delete(tabId);
    candidates.delete(tabId);
    if (partyState.kind === "active" && partyState.party.tabId === tabId) {
      transition({ type: "video", hasVideo: false, accessRequired: true });
    }
    await notifyViews({ type: "video:status", tabId, hasVideo: false, accessRequired: true });
  }
  return accessGranted;
}

function invalidateVideoScan(tabId: number): void {
  activeVideoScans.delete(tabId);
  candidates.delete(tabId);
  clearScheduledTabScan(frameScanTimers, tabId);
}

function clearScheduledTabScan(
  timers: Map<number, ReturnType<typeof setTimeout>>,
  tabId: number,
): void {
  const timer = timers.get(tabId);
  if (timer) clearTimeout(timer);
  timers.delete(tabId);
}

function scheduleFrameScan(tabId: number): void {
  clearScheduledTabScan(frameScanTimers, tabId);
  frameScanTimers.set(
    tabId,
    setTimeout(() => {
      frameScanTimers.delete(tabId);
      void scanCurrentTab(tabId);
    }, 150),
  );
}

function scheduleNavigationScan(tabId: number, url: string): void {
  clearScheduledTabScan(navigationScanTimers, tabId);
  navigationScanTimers.set(
    tabId,
    setTimeout(() => {
      navigationScanTimers.delete(tabId);
      void scanCurrentTab(tabId, url);
    }, 400),
  );
}

async function scanCurrentTab(tabId: number, expectedUrl?: string): Promise<void> {
  try {
    let tab = await chrome.tabs.get(tabId);
    if (expectedUrl && (!tab.url || !samePartyDestination(tab.url, expectedUrl))) return;
    const accessGranted = await scanTab(tabId);
    tab = await chrome.tabs.get(tabId);
    if (expectedUrl && (!tab.url || !samePartyDestination(tab.url, expectedUrl))) return;
    await maybePublishLeaderDestination(tabId, tab);
    await notifyViews({
      type: "tab:navigated",
      tabId,
      url: tab.url,
      title: tab.title,
      video: videoScan(tabId, accessGranted),
    });
  } catch {
    // Navigation can replace or close a tab while its delayed scan is running.
  }
}

async function handleTabUpdate(
  tabId: number,
  change: chrome.tabs.OnUpdatedInfo,
  tab: chrome.tabs.Tab,
): Promise<void> {
  if (change.url && partyState.kind === "active" && partyState.party.tabId === tabId) {
    cancelLeaderDestinationSchedule();
    invalidateVideoScan(tabId);
    if (!samePartyDestination(change.url, pendingLeaderDestination)) pendingLeaderDestination = "";
    transition({
      type: "tab-destination",
      tabId,
      atDestination: samePartyDestination(change.url, partyState.party.tabUrl),
    });
    transition({ type: "video", hasVideo: false });
    scheduleNavigationScan(tabId, change.url);
  }
  if (change.status === "loading") {
    cancelLeaderDestinationSchedule();
    clearScheduledTabScan(navigationScanTimers, tabId);
    invalidateVideoScan(tabId);
    if (partyState.kind === "active" && partyState.party.tabId === tabId) {
      transition({ type: "video", hasVideo: false });
    }
  }
  if (change.status !== "complete") return;
  clearScheduledTabScan(navigationScanTimers, tabId);

  if (partyState.kind === "active" && partyState.party.tabId === tabId) {
    const destination = partyState.party.tabUrl;
    transition({
      type: "tab-destination",
      tabId,
      atDestination: Boolean(tab.url && samePartyDestination(tab.url, destination)),
    });
  }
  const accessGranted = await scanTab(tabId);
  const currentTab = await chrome.tabs.get(tabId);
  if (!tab.url || !currentTab.url || !samePartyDestination(currentTab.url, tab.url)) {
    return;
  }
  await consumePendingJoin(tabId);
  await maybePublishLeaderDestination(tabId, currentTab);
  if (
    partyState.kind === "active" &&
    partyState.party.tabId === tabId &&
    partyState.party.atDestination &&
    bestCandidate(tabId) &&
    playbackTarget
  ) {
    await applyLatestRemotePlayback(partyState.party.partyId);
  }
  await notifyViews({
    type: "tab:navigated",
    tabId,
    url: currentTab.url,
    title: currentTab.title,
    video: videoScan(tabId, accessGranted),
  });
}

async function applyLatestRemotePlayback(partyId: string): Promise<void> {
  if (
    !playbackTarget ||
    partyState.kind === "idle" ||
    partyState.party.partyId !== partyId ||
    !partyState.party.atDestination
  ) {
    return;
  }
  const target = playbackTarget;
  const position =
    target.action === "play"
      ? liveTimeFromEnd({
          playing: true,
          timeFromEnd: target.timeFromEnd,
          updatedAt: target.updatedAt,
        })
      : target.timeFromEnd;
  const result = await applyPlayback(partyState.party.tabId, target.action, position);
  if (
    (partyState as PartyState).kind === "idle" ||
    partyState.party.partyId !== partyId ||
    playbackTarget !== target
  )
    return;
  if (target.commandId)
    partySocket?.syncResult(
      target.commandId,
      result.ok
        ? "applied"
        : result.reason === "interaction-required"
          ? "autoplay-blocked"
          : partyState.party.accessRequired
            ? "permission-required"
            : result.reason === "video-unavailable"
              ? "video-missing"
              : "failed",
    );
  if (result.ok) {
    if (playbackTarget === target) retriedPlaybackTarget = null;
    transitionIfCurrent(partyId, { type: "playback-blocked", blocked: false });
    return;
  }
  if (result.reason === "interaction-required") {
    transitionIfCurrent(partyId, { type: "playback-blocked", blocked: true });
    return;
  }
  if (result.reason === "video-unavailable" && retriedPlaybackTarget !== target) {
    retriedPlaybackTarget = target;
    const tabId = partyState.party.tabId;
    invalidateVideoScan(tabId);
    scheduleFrameScan(tabId);
    return;
  }
  if (result.reason !== "video-unavailable") {
    transitionIfCurrent(partyId, { type: "notice", notice: result.error });
  }
}

function rememberPlaybackTarget(action: PlaybackAction, timeFromEnd: number): void {
  const previousAction = playbackTarget?.action;
  playbackTarget = {
    action:
      action === "seek" && previousAction && previousAction !== "seek" ? previousAction : action,
    timeFromEnd,
    updatedAt: Date.now(),
  };
}

function bestCandidate(tabId: number): VideoCandidate | undefined {
  const scanId = activeVideoScans.get(tabId);
  return [...(candidates.get(tabId)?.values() ?? [])]
    .filter((candidate) => candidate.hasVideo && candidate.scanId === scanId)
    .sort((left, right) => right.score - left.score || right.area - left.area)[0];
}

function videoScan(
  tabId: number,
  accessGranted: boolean,
): { hasVideo: boolean; accessRequired: boolean } {
  return {
    hasVideo: Boolean(bestCandidate(tabId)),
    accessRequired: !accessGranted,
  };
}

async function ensureIdentity(): Promise<PeerIdentity> {
  const stored = await chrome.storage.local.get("identity");
  if (stored.identity) return stored.identity as PeerIdentity;
  const identity: PeerIdentity = {
    id: crypto.randomUUID(),
    name: `${pick(adjectives)} ${pick(animals)}`,
    emoji: getRandomEmoji(),
  };
  await chrome.storage.local.set({ identity });
  return identity;
}

async function notifyViews(message: object): Promise<void> {
  await chrome.runtime.sendMessage(message).catch(() => undefined);
}

async function markToolbarJoin(tabId: number): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#7c3aed" });
  await chrome.action.setBadgeText({ tabId, text: "1" });
  await chrome.action.setTitle({ tabId, title: "Click to join your Jelly Party" });
}

async function markPartyActive(): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
  await chrome.action.setBadgeText({ text: "ON" });
  await chrome.action.setTitle({ title: "Return to your Jelly Party" });
}

async function preparePartySidebar(tabId: number): Promise<void> {
  await chrome.sidePanel
    ?.setOptions({ tabId, path: `src/sidebar/sidebar.html?tab=${tabId}`, enabled: true })
    .catch(() => undefined);
}

async function openPartySidebar(tabId: number): Promise<boolean> {
  if (chrome.sidePanel) {
    // Deliberately not awaited: open() has to stay in the caller's task so that a
    // user gesture still counts.
    void preparePartySidebar(tabId);
    return chrome.sidePanel.open({ tabId }).then(
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
      .catch(() => false) ?? false
  );
}

function chromeSidePanel(): typeof chrome.sidePanel & {
  close?: (options: chrome.sidePanel.CloseOptions) => Promise<void>;
  onClosed?: chrome.events.Event<(info: chrome.sidePanel.PanelClosedInfo) => void>;
} {
  return chrome.sidePanel as typeof chrome.sidePanel & {
    close?: (options: chrome.sidePanel.CloseOptions) => Promise<void>;
    onClosed?: chrome.events.Event<(info: chrome.sidePanel.PanelClosedInfo) => void>;
  };
}

async function toggleFirefoxSidebar(): Promise<boolean> {
  const firefox = globalThis as typeof globalThis & {
    browser?: { sidebarAction?: { toggle(): Promise<void> } };
  };
  return (
    firefox.browser?.sidebarAction
      ?.toggle()
      .then(() => true)
      .catch(() => false) ?? false
  );
}

async function constrainPartyPanelTo(partyTabId: number): Promise<void> {
  if (!chrome.sidePanel) return;
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.filter((tab) => tab.id && tab.id !== partyTabId).map((tab) => disablePartyPanel(tab.id!)),
  );
}

async function disablePartyPanel(tabId: number): Promise<void> {
  await chrome.sidePanel?.setOptions({ tabId, enabled: false }).catch(() => undefined);
}

async function restorePartyPanels(): Promise<void> {
  if (!chrome.sidePanel) return;
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => tab.id)
      .map((tab) =>
        chrome.sidePanel.setOptions({
          tabId: tab.id!,
          path: "src/sidebar/sidebar.html",
          enabled: true,
        }),
      ),
  ).catch(() => undefined);
}

function sameDestination(current: string | undefined, expected: string): boolean {
  if (!current) return false;
  try {
    const currentUrl = new URL(current);
    const expectedUrl = new URL(expected);
    return currentUrl.origin === expectedUrl.origin && currentUrl.pathname === expectedUrl.pathname;
  } catch {
    return false;
  }
}

function samePartyDestination(current: string, expected: string): boolean {
  try {
    const currentUrl = new URL(current);
    const expectedUrl = new URL(expected);
    currentUrl.hash = "";
    expectedUrl.hash = "";
    currentUrl.searchParams.sort();
    expectedUrl.searchParams.sort();
    return currentUrl.href === expectedUrl.href;
  } catch {
    return false;
  }
}

function bounded(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.trim() && value.length <= maximum ? value.trim() : null;
}

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)] as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
