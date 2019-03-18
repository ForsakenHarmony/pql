import { createRequest, PqlError } from '@pql/client';
import { noop, useClient } from './util';
import { useCallback, useEffect, useState } from 'preact/hooks';

interface UseSubscriptionArgs<V> {
  query: string;
  variables?: V;
}

type SubscriptionHandler<T, R> = (prev: R, data: T) => R;

interface UseSubscriptionState<T> {
  fetching: boolean;
  data?: T;
  error?: PqlError;
}

type UseSubscriptionResponse<T> = [UseSubscriptionState<T>];

export const useSubscriptionWithQuery = <T = any, R = T, V = object>(
  args: UseSubscriptionArgs<V>,
  handler?: SubscriptionHandler<T, R>
): UseSubscriptionResponse<R> => {
  let queryUnsubscribe = noop;
  let subcriptionUnsubscribe = noop;

  const client = useClient();
  const queryRequest = createRequest(args.query, args.variables);
  const subRequest = createRequest(args.query, args.variables);

  const [state, setState] = useState<UseSubscriptionState<R>>({
    fetching: true,
    error: undefined,
    data: undefined,
  });

  const executeSubscription = useCallback(() => {
    subcriptionUnsubscribe();

    const sub = client
      .execute<T, V>({
        request: subRequest,
      })
      .subscribe({
        next({ data, error }) {
          setState(s => ({
            ...s,
            data:
              handler != undefined
                ? handler(s.data!, data as any)
                : (data as any),
            error,
          }));
        },
        error(error) {
          setState(s => ({ ...s, error }));
        },
      });

    subcriptionUnsubscribe = sub.unsubscribe;
  }, [subRequest.hash]);

  const executeQuery = useCallback(() => {
    queryUnsubscribe();
    setState(s => ({ ...s, fetching: true }));

    const sub = client
      .execute<R, V>({
        request: queryRequest,
      })
      .subscribe({
        next({ data, error }): void {
          setState({ fetching: false, data, error });
          executeSubscription();
        },
        error(error): void {
          setState(s => ({ ...s, error }));
        },
      });

    queryUnsubscribe = sub.unsubscribe;
  }, [queryRequest.hash]);

  useEffect(() => {
    executeQuery();
    return () => {
      queryUnsubscribe();
      subcriptionUnsubscribe();
    };
  }, [queryRequest.hash, subRequest.hash]);

  return [state];
};
