import {
  GqlTransport,
  Operation,
  OperationResult,
  OperationVariables,
  TransportOptions,
} from '@pql/client';
import { Observable, SubscriptionObserver } from '@pql/observable';

enum MsgTypes {
  GQL_CONNECTION_INIT = 'connection_init', // Client -> Server
  GQL_CONNECTION_ACK = 'connection_ack', // Server -> Client
  GQL_CONNECTION_ERROR = 'connection_error', // Server -> Client
  GQL_CONNECTION_TERMINATE = 'connection_terminate', // Client -> Server
  GQL_START = 'start', // Client -> Server
  GQL_DATA = 'data', // Server -> Client
  GQL_ERROR = 'error', // Server -> Client
  GQL_COMPLETE = 'complete', // Server -> Client
  GQL_STOP = 'stop', // Client -> Server
}

interface SocketOptions extends TransportOptions {
  timeout?: number;
  maxAttempts?: number;
  headers?: { [index: string]: string };
  checkOnline?: boolean;
}

const defaultOpts: Partial<SocketOptions> = {
  timeout: 1000,
  maxAttempts: Infinity,
  checkOnline: false,
};

export class SocketTransport implements GqlTransport {
  private ws!: WebSocket;
  private counter: number = 0;
  private readonly max: number;
  private isOpen: boolean = false;
  private isReconnecting: boolean = false;
  private online: boolean = true;
  private readonly opts: SocketOptions;
  private buffer: any[] = [];
  private subscriptions: {
    [key: string]: {
      handler: SubscriptionObserver<any>;
      message: {
        id: string;
        type: MsgTypes;
        payload: any;
      };
    };
  } = {};
  private lastid: number = 0;

  constructor(opts: SocketOptions) {
    this.opts = Object.assign(defaultOpts, opts, typeof window === 'undefined' ? {
      watchOnline: false
    } : {});
    this.max = opts.maxAttempts || Infinity;
    if (opts.checkOnline) {
      this.onlineChange = this.onlineChange.bind(this);
      this.onlineChange();
      addEventListener('online', this.onlineChange);
      addEventListener('offline', this.onlineChange);
    }
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
        sub && sub.handler.next(data.payload.data);
        break;
      }
      case MsgTypes.GQL_COMPLETE: {
        sub && sub.handler.complete();
        delete this.subscriptions[data.id];
        break;
      }
      case MsgTypes.GQL_ERROR: {
        sub && sub.handler.error(data.payload.errors);
        break;
      }
    }
  }

  private open() {
    this.ws = new WebSocket(this.opts.url, 'graphql-ws');

    this.ws.onmessage = this.onMessage.bind(this);

    this.ws.onopen = () => {
      this.isOpen = true;
      if (this.isReconnecting) {
        Object.values(this.subscriptions).forEach(s => this.json(s.message));
      }
      this.counter = 0;
      this.isReconnecting = false;

      const message = {
        type: MsgTypes.GQL_CONNECTION_INIT,
        payload: this.opts.headers,
      };

      this.json(message);
      this.buffer.forEach(m => this.json(m));
    };

    this.ws.onclose = e => {
      if (e.code === 1000 || e.code === 1005) {
        this.isOpen = false;
        this.isReconnecting = false;
      } else {
        this.reconnect(e);
      }
      e.code === 1e3 || e.code === 1005 || this.reconnect(e);
    };

    this.ws.onerror = (e: Event) => {
      if (e && (e as any).code === 'ECONNREFUSED') {
        this.reconnect(e);
      } else {
        this.flushError(e);
      }
    };
  }

  private flushError(e?: Event) {
    Object.values(this.subscriptions).forEach(
      ({ handler, message: { id } }) => {
        handler.error(e);
        delete this.subscriptions[id];
      }
    );
  }

  private reconnect(e?: Event) {
    if (this.counter < this.max && this.online) {
      this.counter++;
      this.isReconnecting = true;
      setTimeout(() => {
        this.open();
      }, this.opts.timeout);
    } else {
      this.flushError(e);
    }
  }

  private json(x: any) {
    this.ws.send(JSON.stringify(x));
  }

  query<T, Vars = OperationVariables>(
    operation: Operation<Vars>
  ): Observable<OperationResult<T>> {
    return this.subscribe<T, Vars>(operation);
  }

  subscribe<T, Vars = OperationVariables>(
    operation: Operation<Vars>
  ): Observable<OperationResult<T>> {
    return new Observable(observer => {
      const id = String(this.lastid++);

      this.subscriptions[id] = {
        handler: observer,
        message: {
          id,
          type: MsgTypes.GQL_START,
          payload: operation,
        },
      };
    });
  }

  close(): Promise<void> {
    return Promise.resolve().then(() => {
      if (this.opts.checkOnline) {
        removeEventListener('online', this.onlineChange);
        removeEventListener('offline', this.onlineChange);
      }

      if (!this.isOpen) {
        this.isReconnecting = false;
        return;
      }

      Object.values(this.subscriptions).forEach(
        ({ handler, message: { id } }) => {
          const message = {
            id,
            type: MsgTypes.GQL_STOP,
          };

          this.json(message);

          handler.complete();
        }
      );

      this.json({
        type: MsgTypes.GQL_CONNECTION_TERMINATE,
      });

      this.ws.close(1000, 'closed');
    });
  }
}
