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

export { gql } from '@pql/client';
export {
  Provider,
  useQuery,
  useMutation,
  useSubscription,
  useSubscriptionWithQuery,
} from '@pql/hooks';
