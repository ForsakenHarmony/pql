import {
  Obj,
  GqlTransport,
  graphqlError,
  networkError,
  OperationContext,
  OperationResult,
} from '@pql/client';
import { Observable, SubscriptionObserver } from '@pql/observable';

export function noop() {}

const MsgTypes = {
  GQL_CONNECTION_INIT: 'connection_init', // Client -> Server
  GQL_CONNECTION_ACK: 'connection_ack', // Server -> Client
  GQL_CONNECTION_ERROR: 'connection_error', // Server -> Client
  GQL_CONNECTION_TERMINATE: 'connection_terminate', // Client -> Server
  GQL_START: 'start', // Client -> Server
  GQL_DATA: 'data', // Server -> Client
  GQL_ERROR: 'error', // Server -> Client
  GQL_COMPLETE: 'complete', // Server -> Client
  GQL_STOP: 'stop', // Client -> Server
};

interface SocketOptions {
  url: string;
  timeout?: number;
  maxAttempts?: number;
  headers?: { [index: string]: string };
  checkOnline?: boolean;
}

const defaultOpts: Partial<SocketOptions> = {
  timeout: 1000,
  maxAttempts: 5,
  checkOnline: false,
};

function msg(type: string, payload?: any, id?: string) {
  return {
    type,
    payload,
    id,
  };
}

function listen(cb: (online: boolean) => void, add = true): Function {
  let fn = () => cb(navigator.onLine);
  let f = (window as any)[(add ? 'add' : 'remove') + 'EventListener'];
  ['online', 'offline'].map(ev => f(ev, fn));
  return listen.bind(null, fn, false);
}

export class SocketTransport implements GqlTransport {
  private ws!: WebSocket;
  private counter: number = 0;
  private readonly max: number;
  private isOpen: boolean = false;
  private isReconnecting: boolean = false;
  private online: boolean = true;
  private readonly opts: SocketOptions;
  private subscriptions: {
    [key: string]: {
      observer: SubscriptionObserver<any>;
      message: {
        id: string;
        type: string;
        payload: any;
      };
      type: 'query' | 'mutation' | 'subscription';
    };
  } = {};
  private lastid: number = 0;
  private readonly unsub: Function;

  constructor(opts: SocketOptions) {
    this.opts = Object.assign(
      defaultOpts,
      opts,
      typeof window === 'undefined'
        ? {
            watchOnline: false,
          }
        : {}
    );
    this.max = opts.maxAttempts || Infinity;
    this.unsub = opts.checkOnline ? listen(this.onlineChange.bind(this)) : noop;
    this.open();
  }

  private onlineChange() {
    this.online = navigator.onLine;
    if (!this.online && this.isOpen) {
      this.ws.close(1000, 'closed');
    } else if (this.isReconnecting && this.online) {
      this.reconnect();
    }
  }

  private onMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);

    const sub = this.subscriptions[data.id];

    switch (data.type) {
      case MsgTypes.GQL_CONNECTION_ACK: {
        console.log('init_success, the handshake is complete');
        break;
      }
      case MsgTypes.GQL_CONNECTION_ERROR: {
        console.error('init_fail returned from WebSocket server');
        break;
      }
      case MsgTypes.GQL_DATA: {
        sub && sub.observer.next(data.payload);
        break;
      }
      case MsgTypes.GQL_COMPLETE: {
        sub && sub.observer.complete();
        delete this.subscriptions[data.id];
        break;
      }
      case MsgTypes.GQL_ERROR: {
        sub && sub.observer.error(graphqlError(data.payload));
        break;
      }
    }
  }

  private open() {
    this.ws = new WebSocket(this.opts.url, 'graphql-ws');

    this.ws.onmessage = this.onMessage.bind(this);

    this.ws.onopen = () => {
      this.isOpen = true;
      this.counter = 0;

      const message = msg(MsgTypes.GQL_CONNECTION_INIT, this.opts.headers);

      this.json(message);
      Object.values(this.subscriptions).forEach(
        s => s.type !== 'mutation' && this.json(s.message)
      );
    };

    this.ws.onclose = e => {
      if (~[0, 1, 5, 10].map(i => i + 1e3).indexOf(e.code)) {
        this.isOpen = false;
        this.isReconnecting = false;
        this.flushError(e);
      } else {
        this.reconnect(e);
      }
    };
  }

  private flushError(e?: Event) {
    Object.values(this.subscriptions).forEach(
      ({ observer, message: { id } }) => {
        observer.error(networkError(e as any));
        delete this.subscriptions[id];
      }
    );
  }

  private reconnect(e?: Event) {
    if (this.counter < this.max) {
      if (!this.online) return;
      this.counter++;
      this.isReconnecting = true;
      setTimeout(this.open.bind(this), this.opts.timeout);
    } else {
      this.flushError(e);
    }
  }

  private json(x: any) {
    this.ws.send(JSON.stringify(x));
  }

  execute<T = Obj, Vars = {}>(
    ctx: OperationContext<Vars>
  ): Observable<OperationResult<T>> {
    return new Observable<OperationResult<T>>(observer => {
      const id = String(this.lastid++);

      const message = msg(MsgTypes.GQL_START, ctx.operation, id) as any;
      this.subscriptions[id] = { observer, message, type: ctx.type };
      if (this.online && this.isOpen) this.json(message);
      return () => {
        this.json(msg(MsgTypes.GQL_STOP, null, id));
      };
    });
  }

  close() {
    return Promise.resolve().then(() => {
      this.unsub();

      if (!this.isOpen) {
        this.isReconnecting = false;
        return;
      }

      Object.values(this.subscriptions).forEach(sub => {
        this.json(msg(MsgTypes.GQL_STOP, void 0, sub.message.id));
        sub.observer.complete();
      });

      this.json(msg(MsgTypes.GQL_CONNECTION_TERMINATE));
      this.ws.close(1000, 'closed');
    });
  }
}
