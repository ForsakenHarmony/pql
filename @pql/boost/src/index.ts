import { cache, DefaultStorage } from '@pql/cache';
import { Client, Obj } from '@pql/client';
import { SocketTransport } from '@pql/websocket';

export function createClient(url: string, headers: Obj = {}) {
  const socket = new SocketTransport({
    url,
    headers,
  });

  return new Client(socket, [cache(new DefaultStorage())]);
}

export * from '@pql/cache';
export * from '@pql/websocket';
export * from '@pql/client';
export * from '@pql/hooks';
