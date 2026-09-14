import type {
  ClientMessage,
  PartyDestinationInput,
  PeerIdentity,
  PlaybackAction,
  ServerMessage,
} from "jelly-party-lib";

interface PartySocketHandlers {
  onMessage(message: ServerMessage): void;
  onOpen(): void;
  onClose(): void;
  onError(message: string): void;
}

export const PARTY_HEARTBEAT_MS = 20_000;

export class PartySocket {
  #socket: WebSocket | null = null;
  #heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly url: string,
    private readonly handlers: PartySocketHandlers,
  ) {}

  connect(partyId: string, peer: PeerIdentity, destination: PartyDestinationInput): void {
    this.close();
    const socket = new WebSocket(`${this.url}/party/${encodeURIComponent(partyId)}`);
    this.#socket = socket;
    socket.addEventListener("open", () => {
      if (this.#socket !== socket) return;
      this.send({ type: "join", peer, destination });
      this.#startHeartbeat();
      this.handlers.onOpen();
    });
    socket.addEventListener("message", (event) => {
      if (this.#socket !== socket) return;
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (message.type === "heartbeat-ack") return;
        this.handlers.onMessage(message);
      } catch {
        this.handlers.onError("The party sent an unreadable message");
      }
    });
    socket.addEventListener("error", () => {
      if (this.#socket === socket) this.handlers.onError("Could not connect to the party");
    });
    socket.addEventListener("close", () => {
      if (this.#socket !== socket) return;
      this.#stopHeartbeat();
      this.#socket = null;
      this.handlers.onClose();
    });
  }

  chat(text: string): boolean {
    return this.send({ type: "chat", text });
  }

  playback(action: PlaybackAction, timeFromEnd: number, destinationRevision: number): void {
    this.send({ type: "playback", action, timeFromEnd, destinationRevision });
  }

  destination(destination: PartyDestinationInput): boolean {
    return this.send({ type: "destination", destination });
  }

  leader(peerId: string): boolean {
    return this.send({ type: "leader", peerId });
  }

  history(beforeId: number): void {
    this.send({ type: "history", beforeId });
  }

  close(): void {
    const socket = this.#socket;
    this.#stopHeartbeat();
    this.#socket = null;
    socket?.close();
  }

  #startHeartbeat(): void {
    this.#stopHeartbeat();
    this.#heartbeat = setInterval(() => {
      this.send({ type: "heartbeat" });
    }, PARTY_HEARTBEAT_MS);
  }

  #stopHeartbeat(): void {
    if (this.#heartbeat) clearInterval(this.#heartbeat);
    this.#heartbeat = null;
  }

  private send(message: ClientMessage): boolean {
    if (this.#socket?.readyState !== WebSocket.OPEN) return false;
    this.#socket.send(JSON.stringify(message));
    return true;
  }
}
