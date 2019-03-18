import { createRequest, PqlError } from '@pql/client';
import { noop, useClient } from './util';
import { useCallback, useEffect, useState } from 'preact/hooks';

interface UseQueryArgs<V> {
  query: string;
  variables?: V;
}

interface UseQueryState<T> {
  fetching: boolean;
  data?: T | null;
  error?: PqlError;
}

type UseQueryResponse<T> = [UseQueryState<T>, () => void];

export const useQuery = <T = any, V = object>(
  args: UseQueryArgs<V>
): UseQueryResponse<T> => {
  let unsubscribe = noop;

  const client = useClient();
  const request = createRequest(args.query, args.variables);

  const [state, setState] = useState<UseQueryState<T>>({
    fetching: false,
    error: undefined,
    data: null,
  });

  const executeQuery = useCallback(() => {
    unsubscribe();
    setState(s => ({ ...s, fetching: true }));

    const sub = client
      .execute<T, V>({
        request,
      })
      .subscribe({
        next({ data, error }): void {
          setState({ fetching: false, data, error });
        },
        error(error): void {
          setState(s => ({ ...s, error }));
        },
      });

    unsubscribe = sub.unsubscribe;
  }, [request.hash]);

  useEffect(() => {
    executeQuery();
    return unsubscribe;
  }, [request.hash]);

  return [state, executeQuery];
};
