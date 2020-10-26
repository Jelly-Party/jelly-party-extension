/** The protocol type that holds your message types and their schema. */

import { Runtime } from "webextension-polyfill-ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Protoframe = Record<string, ProtoframeEntry<any, any>>;
export type ProtoframeEntry<B, R extends {}> = {
  body: B;
  response?: R;
};

/** Enumerates all valid types of messages defined in a given protocol. */
export type ProtoframeMessageType<P extends Protoframe> = string & keyof P;

/** Enumerates the `body` and `response` entry keys for each message. */
export type ProtoframeEntryType<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
> = string & keyof Protoframe[T];

/**
 * A type reference to the body or response type of a given message for a
 * protocol. If we have a simple protocol:
 *
 * ```
 * type MyProtocol = {
 *   get: {
 *     body: { key: string; }
 *   }
 * }
 * ```
 *
 * Then the type `ProtoframeEntryPropType<MyProtocol, 'get', 'body'>` references
 * type: `{ key: string }`.
 */
export type ProtoframeEntryPropType<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>,
  E extends ProtoframeEntryType<P, T>
> = P[T][E];

/** A specialization of `ProtoframeEntryPropType` on the `body` key. */
export type ProtoframeMessageBody<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
> = ProtoframeEntryPropType<P, T, "body">;

/** A specialization of `ProtoframeEntryPropType` on the `response` key. */
export type ProtoframeMessageResponse<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
> = ProtoframeEntryPropType<P, T, "response">;

/**
 * A protocol definition. This is used to include value `type` which namespaces
 * communication across an iframe.
 */
export interface ProtoframeDescriptor<_P extends Protoframe> {
  type: string;
}

/** An internal payload body for a protocol message going between windows. */
export interface ProtoframePayloadBody<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
> {
  type: string;
  body: ProtoframeMessageBody<P, T>;
}

/** An internal payload response for a protocol message going between windows. */
export interface ProtoframePayloadResponse<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
> {
  type: string;
  response: ProtoframeMessageResponse<P, T>;
}

/** An internal enumerator for ask and tell actions. Used to namespace messages. */
export type ProtoframeAction = "ask" | "tell";

export function hasValue<V>(value: V | null | undefined): value is V {
  return value !== null && value !== undefined;
}

type SystemProtocol = {
  ping: {
    body: {};
    response: {};
  };
};

function mkPayloadType<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
>(
  protocol: ProtoframeDescriptor<P>,
  action: ProtoframeAction,
  type: T
): string {
  return `${protocol.type}#${action}#${type}`;
}

function mkPayloadBody<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
>(
  protocol: ProtoframeDescriptor<P>,
  action: ProtoframeAction,
  type: T,
  body: ProtoframeMessageBody<P, T>
): ProtoframePayloadBody<P, T> {
  return {
    body,
    type: mkPayloadType(protocol, action, type),
  };
}

function mkPayloadResponse<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
>(
  protocol: ProtoframeDescriptor<P>,
  type: T,
  response: ProtoframeMessageResponse<P, T>
): ProtoframePayloadResponse<P, T> {
  return {
    response,
    type: mkPayloadType(protocol, "ask", type),
  };
}

function isPayloadBodyOfType<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>
>(
  protocol: ProtoframeDescriptor<P>,
  action: ProtoframeAction,
  type: T,
  payload: { type?: string; body?: unknown } | undefined
): payload is ProtoframePayloadBody<P, T> {
  if (hasValue(payload)) {
    const payloadType = payload.type;
    if (hasValue(payloadType) && hasValue(payload.body)) {
      const [p, a, t] = payloadType.split("#");
      return p === protocol.type && a === action && t === type;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function isPayloadResponseOfType<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>,
  R extends ProtoframePayloadResponse<P, T>
>(
  protocol: ProtoframeDescriptor<P>,
  type: T,
  payload: { type?: string; response?: unknown } | undefined
): payload is R {
  if (hasValue(payload)) {
    const payloadType = payload.type;
    if (hasValue(payloadType) && hasValue(payload.response)) {
      const [p, a, t] = payloadType.split("#");
      return p === protocol.type && a === "ask" && t === type;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

function destroyAll(
  listeners: [Runtime.Port, (ev: MessageEvent) => void][]
): void {
  listeners.forEach(([w, l]) => w.onMessage.removeListener(l));
  listeners.length = 0;
}

function awaitResponse<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>,
  R extends ProtoframeMessageResponse<P, T>
>(
  messagePort: Runtime.Port,
  protocol: ProtoframeDescriptor<P>,
  type: T
): Promise<R> {
  return new Promise((accept) => {
    const handle: (ev: MessageEvent) => void = (ev) => {
      const payload = ev.data;
      if (isPayloadResponseOfType(protocol, type, payload)) {
        messagePort.onMessage.removeListener(handle);
        accept(payload.response);
      }
    };
    messagePort.onMessage.addListener(handle);
  });
}

function handleTell0<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>,
  _R extends ProtoframeMessageResponse<P, T> & undefined
>(
  messagePort: Runtime.Port,
  protocol: ProtoframeDescriptor<P>,
  type: T,
  handler: (body: ProtoframeMessageBody<P, T>) => void
): [Runtime.Port, (ev: MessageEvent) => void] {
  const listener = (ev: MessageEvent): void => {
    const payload = ev.data;
    if (isPayloadBodyOfType(protocol, "tell", type, payload)) {
      handler(payload.body);
    }
  };
  messagePort.onMessage.addListener(listener);
  return [messagePort, listener];
}

function handleAsk0<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>,
  R extends ProtoframeMessageResponse<P, T> & {}
>(
  messagePort: Runtime.Port,
  protocol: ProtoframeDescriptor<P>,
  type: T,
  handler: (body: ProtoframeMessageBody<P, T>) => Promise<R>
): [Runtime.Port, (ev: MessageEvent) => void] {
  const listener = async (ev: MessageEvent): Promise<void> => {
    const payload = ev.data;
    if (isPayloadBodyOfType(protocol, "ask", type, payload)) {
      const response = await handler(payload.body);
      messagePort.postMessage(mkPayloadResponse(protocol, type, response));
    }
  };
  messagePort.onMessage.addListener(listener);
  return [messagePort, listener];
}

function tell0<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>,
  _R extends ProtoframeMessageResponse<P, T> & undefined
>(
  messagePort: Runtime.Port,
  protocol: ProtoframeDescriptor<P>,
  type: T,
  body: ProtoframeMessageBody<P, T>
): _R {
  return messagePort.postMessage(
    mkPayloadBody(protocol, "tell", type, body)
  ) as _R;
}

async function ask0<
  P extends Protoframe,
  T extends ProtoframeMessageType<P>,
  B extends ProtoframeMessageBody<P, T>,
  R extends ProtoframeMessageResponse<P, T> & {}
>(
  messagePort: Runtime.Port,
  protocol: ProtoframeDescriptor<P>,
  type: T,
  body: B,
  timeout: number
): Promise<R> {
  // eslint-disable-next-line no-async-promise-executor
  const run = new Promise<R>(async (accept, reject) => {
    const timeoutHandler = setTimeout(
      () => reject(new Error(`Failed to get response within ${timeout}ms`)),
      timeout
    );
    const response = await awaitResponse(messagePort, protocol, type);
    clearTimeout(timeoutHandler);
    accept(response);
  });
  messagePort.postMessage(mkPayloadBody(protocol, "ask", type, body));
  return run;
}

interface Connector {
  /** Destroy the connector and all resources/listeners being held. */
  destroy(): void;
}

interface AbstractProtoframeSubscriber<P extends Protoframe> extends Connector {
  /**
   * Handle a message that was sent with the [[ProtoframePublisher.tell]]
   * function.
   *
   * @param type The message type being handled
   * @param handler The handler function for the message
   */
  handleTell<
    T extends ProtoframeMessageType<P>,
    _R extends ProtoframeMessageResponse<P, T> & undefined
  >(
    type: T,
    handler: (body: ProtoframeMessageBody<P, T>) => void
  ): void;
}

interface AbstractProtoframePublisher<P extends Protoframe> extends Connector {
  /**
   * Send a message to a receiving connector. This is a fire-and-forget emitter
   * that does not accept a response. If you want a request-response workflow,
   * use [[ProtoframePubsub.ask]].
   *
   * @param type The message type being sent
   * @param body The body of the message to send
   */
  tell<
    T extends ProtoframeMessageType<P>,
    _R extends ProtoframeMessageResponse<P, T> & undefined
  >(
    type: T,
    body: ProtoframeMessageBody<P, T>
  ): void;
}

interface AbstractProtoframePubsub<P extends Protoframe>
  extends AbstractProtoframeSubscriber<P>,
    AbstractProtoframePublisher<P> {
  /**
   * Send an "ask" message to the receiving connector. On the other end, a
   * connector would have invoked `handleAsk` in order to receive this message
   * and issue a response.
   *
   * The promise returned by this call will resolve when a response as been
   * received from the target connector, or if the timeout has been exceeded
   *
   * @param type The message type being asked
   * @param body The body of the ask message
   * @param timeout How long to wait for a response before the resulting promise
   *  is rejected with a timeout error.
   */
  ask<
    T extends ProtoframeMessageType<P>,
    B extends ProtoframeMessageBody<P, T>,
    R extends ProtoframeMessageResponse<P, T> & {}
  >(
    type: T,
    body: B,
    timeout?: number
  ): Promise<R>;

  /**
   * Handle an "ask" message and provide a response. This is invoked when the
   * asking connector has invoked the `ask` method of the pubsub connector.
   *
   * @param type The message type being listened to
   * @param handler The message handler that eventually returns a response
   */
  handleAsk<
    T extends ProtoframeMessageType<P>,
    R extends ProtoframeMessageResponse<P, T> & {}
  >(
    type: T,
    handler: (body: ProtoframeMessageBody<P, T>) => Promise<R>
  ): void;
}

export class ProtoframeSubscriber<P extends Protoframe>
  implements AbstractProtoframeSubscriber<P> {
  constructor(
    private readonly protocol: ProtoframeDescriptor<P>,
    private readonly messagePort: Runtime.Port
  ) {}

  private listeners: [Runtime.Port, (ev: MessageEvent) => void][] = [];

  public handleTell<
    T extends ProtoframeMessageType<P>,
    _R extends ProtoframeMessageResponse<P, T> & undefined
  >(type: T, handler: (body: ProtoframeMessageBody<P, T>) => void): void {
    this.listeners.push(
      handleTell0(this.messagePort, this.protocol, type, handler)
    );
  }

  destroy(): void {
    destroyAll(this.listeners);
  }
}

export class ProtoframePublisher<P extends Protoframe>
  implements AbstractProtoframePublisher<P> {
  /**
   * We are a "parent" page that is embedding an iframe, and we wish to connect
   * to that iframe in order to publish messages.
   *
   * @param protocol The protocol this connector will communicate with
   * @param iframe The target iframe HTML element we are connecting to
   * @param targetOrigin The target scheme and host we expect the receiver to be
   */
  public static build<P extends Protoframe>(
    protocol: ProtoframeDescriptor<P>,
    messagePort: Runtime.Port
  ): ProtoframePublisher<P> {
    return new ProtoframePublisher(protocol, messagePort);
  }

  /**
   * We are an "iframe" page that will be embedded, and we wish to connect to a
   * parent page in order to publish messages.
   *
   * @param protocol The protocol this connector will communicate with
   * @param targetOrigin The target scheme and host we expect the receiver to be
   * @param targetWindow The window of the parent frame. This should normally be
   *  the `window.parent`
   */

  private listeners: [Runtime.Port, (ev: MessageEvent) => void][] = [];

  constructor(
    private readonly protocol: ProtoframeDescriptor<P>,
    private readonly messagePort: Runtime.Port
  ) {}

  tell<T extends ProtoframeMessageType<P>, _R extends undefined>(
    type: T,
    body: P[T]["body"]
  ): void {
    tell0(this.messagePort, this.protocol, type, body);
  }

  destroy(): void {
    destroyAll(this.listeners);
  }
}

export class ProtoframePubsub<P extends Protoframe>
  implements AbstractProtoframePubsub<P> {
  /**
   * Connect to the target configured in the supplied pubsub connector by
   * sending ping requests over and over until we get a response.
   *
   * @param pubsub The pubsub connector to wait until is "connected" to its
   *  target
   * @param retries How many times to retry and ping the target. By default,
   *  this will retry 50 times (thus waiting 25 seconds total)
   * @param timeout How long to wait for a response from the target before
   *  retrying. By default the timeout is 500ms (thus waiting 25 seconds total)
   */
  public static async connect<P extends Protoframe>(
    pubsub: ProtoframePubsub<P>,
    retries = 50,
    timeout = 500
  ): Promise<ProtoframePubsub<P>> {
    for (let i = 0; i <= retries; i++) {
      try {
        await pubsub.ping({ timeout });
        return pubsub;
      } catch (_) {
        continue;
      }
    }
    throw new Error(
      `Could not connect on protocol ${pubsub.protocol.type} after ${retries *
        timeout}ms`
    );
  }

  /**
   * We are a "parent" page that is embedding an iframe, and we wish to connect
   * to that iframe for communication.
   *
   * @param protocol The protocol this connector will communicate with
   * @param iframe The target iframe HTML element we are connecting to
   * @param targetOrigin The target scheme and host we expect the receiver to be
   * @param thisWindow The parent window (our window). This should normally be
   *  the current `window`
   */
  public static build<P extends Protoframe>(
    protocol: ProtoframeDescriptor<P>,
    messagePort: Runtime.Port
  ): ProtoframePubsub<P> {
    return new ProtoframePubsub(protocol, messagePort);
  }

  /**
   * We are an "iframe" page that will be embedded, and we wish to connect to a
   * parent page for communication.
   *
   * @param protocol The protocol this connector will communicate with
   * @param targetOrigin The target scheme and host we expect the receiver to be
   * @param thisWindow The window of the current iframe. This should normally be
   *  the current `window`
   * @param targetWindow The window of the parent frame. This should normally be
   *  the `window.parent`
   */

  private systemProtocol: ProtoframeDescriptor<SystemProtocol> = {
    type: `system|${this.protocol.type}`,
  };
  private listeners: [Runtime.Port, (ev: MessageEvent) => void][] = [];

  constructor(
    private readonly protocol: ProtoframeDescriptor<P>,
    private readonly messagePort: Runtime.Port
  ) {
    // Answer internally to ping requests
    handleAsk0(messagePort, this.systemProtocol, "ping", () =>
      Promise.resolve({})
    );
  }

  /**
   * Send a 'ping' request to check if there is a listener open at the target
   * window. If this times out, then it means no listener was available *at the
   * time the ping request was sent*. Since requests are not buffered, then this
   * should be retried if we're waiting for some target iframe to start up and
   * load its assets. See `ProtoframePubsub.connect` as an implementation of
   * this functionality.
   *
   * @param timeout How long to wait for the reply before resulting in an error
   */
  public async ping({ timeout = 10000 }: { timeout?: number }): Promise<void> {
    await ask0(this.messagePort, this.systemProtocol, "ping", {}, timeout);
  }

  public handleTell<
    T extends ProtoframeMessageType<P>,
    _R extends ProtoframeMessageResponse<P, T> & undefined
  >(type: T, handler: (body: ProtoframeMessageBody<P, T>) => void): void {
    this.listeners.push(
      handleTell0(this.messagePort, this.protocol, type, handler)
    );
  }

  public tell<T extends ProtoframeMessageType<P>, _R extends undefined>(
    type: T,
    body: P[T]["body"]
  ): void {
    tell0(this.messagePort, this.protocol, type, body);
  }

  public handleAsk<
    T extends ProtoframeMessageType<P>,
    R extends P[T]["response"] & {}
  >(type: T, handler: (body: P[T]["body"]) => Promise<R>): void {
    this.listeners.push(
      handleAsk0(this.messagePort, this.protocol, type, handler)
    );
  }

  public ask<
    T extends ProtoframeMessageType<P>,
    B extends P[T]["body"],
    R extends P[T]["response"] & {}
  >(type: T, body: B, timeout = 10000): Promise<R> {
    return ask0(this.messagePort, this.protocol, type, body, timeout);
  }

  destroy(): void {
    destroyAll(this.listeners);
  }
}
