import { createRequest, Obj, PqlError } from '@pql/client';
import { noop, useClient } from './util';
import { useCallback, useEffect, useState } from 'preact/hooks';

export interface UseQueryArgs<V> {
  query: string;
  variables?: V;
  skip?: boolean;
}

export interface UseQueryState<T> {
  fetching: boolean;
  data: T | null;
  error: PqlError | null;
}

export type UseQueryResponse<T> = [UseQueryState<T>, (extra?: Obj) => void];

export const useQuery = <T = any, V = object>(
  args: UseQueryArgs<V>
): UseQueryResponse<T> => {
  let [queryUnsubscribe, setQueryUnsubscribe] = useState(() => noop);

  const client = useClient();
  const request = createRequest(args.query, args.variables);

  const [state, setState] = useState<UseQueryState<T>>({
    fetching: false,
    error: null,
    data: null,
  });

  const executeQuery = useCallback(
    (extra: Obj = {}) => {
      queryUnsubscribe();
      setState(s => ({ ...s, fetching: true }));

      const sub = client
        .execute<T, V>({
          request,
          extra,
        })
        .subscribe({
          next({ data, error }): void {
            setState({ fetching: false, data, error });
          },
          error(error): void {
            setState(s => ({ ...s, error }));
          },
        });

      setQueryUnsubscribe(() => sub.unsubscribe.bind(sub));
    },
    [request.hash]
  );

  useEffect(() => {
    if (args.skip) return;
    executeQuery();
    return queryUnsubscribe;
  }, [request.hash, args.skip]);

  return [state, executeQuery];
};
