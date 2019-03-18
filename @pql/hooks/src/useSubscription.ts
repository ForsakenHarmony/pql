import { createRequest, PqlError } from '@pql/client';
import { noop, useClient } from './util';
import { useCallback, useEffect, useState } from 'preact/hooks';

interface UseSubscriptionArgs<V> {
  query: string;
  variables?: V;
}

type SubscriptionHandler<T, R> = (prev: R | void, data: T) => R;

interface UseSubscriptionState<T> {
  data?: T;
  error?: PqlError;
}

type UseSubscriptionResponse<T> = [UseSubscriptionState<T>];

export const useSubscription = <T = any, R = T, V = object>(
  args: UseSubscriptionArgs<V>,
  handler?: SubscriptionHandler<T, R>
): UseSubscriptionResponse<R> => {
  let unsubscribe = noop;

  const client = useClient();
  const request = createRequest(args.query, args.variables);

  const [state, setState] = useState<UseSubscriptionState<R>>({
    error: undefined,
    data: undefined,
  });

  const executeSubscription = useCallback(() => {
    unsubscribe();

    const sub = client
      .execute<T, V>({
        request,
      })
      .subscribe({
        next({ data, error }) {
          setState(s => ({
            data:
              handler != undefined
                ? handler(s.data, data as any)
                : (data as any),
            error,
          }));
        },
        error(error) {
          setState(s => ({ ...s, error }));
        },
      });

    unsubscribe = sub.unsubscribe;
  }, [request.hash]);

  useEffect(() => {
    executeSubscription();
    return unsubscribe;
  }, [request.hash]);

  return [state];
};
