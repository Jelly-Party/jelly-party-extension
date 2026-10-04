import type {
  ClientInfo,
  ClientMessage,
  ClientOutcome,
  PartyDestinationInput,
  PeerIdentity,
  PlaybackAction,
  ServerMessage,
  SyncOutcome,
} from "jelly-party-lib";
interface PartySocketHandlers {
  onMessage(message: ServerMessage): void;
  onOpen(): void;
  onClose(): void;
  onError(message: string): void;
  onConnecting?(): void;
}
export const PARTY_HEARTBEAT_MS = 20_000;
export const PARTY_ACK_TIMEOUT_MS = 45_000;
export const PARTY_JOIN_TIMEOUT_MS = 10_000;
export const PARTY_MAX_RETRIES = 5;

export class PartySocket {
  #socket: WebSocket | null = null;
  #heartbeat: ReturnType<typeof setInterval> | null = null;
  #deadline: ReturnType<typeof setTimeout> | null = null;
  #retry: ReturnType<typeof setTimeout> | null = null;
  #lastAck = 0;
  #attempts = 0;
  #joined = false;
  #hasJoined = false;
  #outcomes = new Set<string>();
  #revision = 0;
  #session: {
    partyId: string;
    peer: PeerIdentity;
    destination: PartyDestinationInput;
    client?: ClientInfo;
  } | null = null;
  constructor(
    private readonly url: string,
    private readonly handlers: PartySocketHandlers,
  ) {}

  connect(
    partyId: string,
    peer: PeerIdentity,
    destination: PartyDestinationInput,
    client?: ClientInfo,
  ): void {
    this.close();
    this.#attempts = 0;
    this.#hasJoined = false;
    this.#outcomes.clear();
    this.#session = { partyId, peer, destination, client };
    this.open();
  }

  private open(): void {
    const session = this.#session;
    if (!session) return;
    this.handlers.onConnecting?.();
    const socket = new WebSocket(`${this.url}/party/${encodeURIComponent(session.partyId)}`);
    this.#socket = socket;
    this.#joined = false;
    this.#deadline = setTimeout(() => this.failed(socket), PARTY_JOIN_TIMEOUT_MS);
    socket.addEventListener("open", () => {
      if (this.#socket !== socket) return;
      this.send({
        type: "join",
        peer: session.peer,
        destination: session.destination,
        ...(session.client ? { client: session.client } : {}),
      });
      this.#lastAck = Date.now();
      this.#heartbeat = setInterval(() => {
        if (Date.now() - this.#lastAck > PARTY_ACK_TIMEOUT_MS) this.failed(socket);
        else this.send({ type: "heartbeat" });
      }, PARTY_HEARTBEAT_MS);
    });
    socket.addEventListener("message", (event) => {
      if (this.#socket !== socket) return;
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (message.type === "heartbeat-ack") {
          this.#lastAck = Date.now();
          return;
        }
        if (message.type === "welcome") {
          if (this.#deadline) clearTimeout(this.#deadline);
          this.#deadline = null;
          this.#joined = true;
          this.#attempts = 0;
          session.destination = message.destination;
          this.#revision = message.destination.revision;
          this.handlers.onOpen();
          if (this.#hasJoined) this.telemetry("connection_recovered");
          this.#hasJoined = true;
        }
        if (message.type === "destination") {
          session.destination = message.destination;
          this.#revision = message.destination.revision;
          this.#outcomes.clear();
        }
        this.handlers.onMessage(message);
      } catch {
        this.handlers.onError("The party sent an unreadable message");
      }
    });
    socket.addEventListener("error", () => this.failed(socket));
    socket.addEventListener("close", (event) => this.failed(socket, event.code));
  }

  private failed(socket: WebSocket, code?: number): void {
    if (socket !== this.#socket) return;
    this.#socket = null;
    this.#joined = false;
    this.clearConnectionTimers();
    socket.close();
    this.handlers.onClose();
    if (!this.#session || code === 1008 || code === 1000) return;
    if (this.#attempts >= PARTY_MAX_RETRIES) {
      this.handlers.onError("Could not reconnect. Check your connection and press Retry.");
      return;
    }
    const delay = 1000 * 2 ** this.#attempts++;
    this.#retry = setTimeout(() => {
      this.#retry = null;
      this.open();
    }, delay);
  }

  chat(text: string): boolean {
    return this.#joined && this.send({ type: "chat", text });
  }
  playback(action: PlaybackAction, timeFromEnd: number, destinationRevision: number): void {
    if (this.#joined) this.send({ type: "playback", action, timeFromEnd, destinationRevision });
  }
  telemetry(outcome: ClientOutcome): void {
    const key = `${this.#revision}:${outcome}`;
    if (this.#joined && !this.#outcomes.has(key) && this.send({ type: "telemetry", outcome }))
      this.#outcomes.add(key);
  }
  syncResult(commandId: string, outcome: SyncOutcome): void {
    if (this.#joined) this.send({ type: "sync-result", commandId, outcome });
  }
  destination(destination: PartyDestinationInput): boolean {
    return this.#joined && this.send({ type: "destination", destination });
  }
  leader(peerId: string): boolean {
    return this.#joined && this.send({ type: "leader", peerId });
  }
  history(beforeId: number): void {
    if (this.#joined) this.send({ type: "history", beforeId });
  }
  close(): void {
    this.#session = null;
    this.#joined = false;
    if (this.#retry) clearTimeout(this.#retry);
    this.#retry = null;
    this.clearConnectionTimers();
    const socket = this.#socket;
    this.#socket = null;
    socket?.close();
  }
  private clearConnectionTimers(): void {
    if (this.#heartbeat) clearInterval(this.#heartbeat);
    if (this.#deadline) clearTimeout(this.#deadline);
    this.#heartbeat = null;
    this.#deadline = null;
  }
  private send(message: ClientMessage): boolean {
    if (this.#socket?.readyState !== WebSocket.OPEN) return false;
    this.#socket.send(JSON.stringify(message));
    return true;
  }
}
