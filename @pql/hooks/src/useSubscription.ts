import { createRequest, PqlError } from '@pql/client';
import { noop, useClient } from './util';
import { useCallback, useEffect, useState } from 'preact/hooks';

export interface UseSubscriptionArgs<V> {
  query: string;
  variables?: V;
}

export type SubscriptionHandler<T, R> = (prev: R | void, data: T) => R;

export interface UseSubscriptionState<T> {
  data?: T;
  error?: PqlError;
}

export type UseSubscriptionResponse<T> = [UseSubscriptionState<T>];

export const useSubscription = <T = any, R = T, V = object>(
  args: UseSubscriptionArgs<V>,
  handler?: SubscriptionHandler<T, R>
): UseSubscriptionResponse<R> => {
  let [subscriptionUnsubscribe, setSubscriptionUnsubscribe] = useState(
    () => noop
  );

  const client = useClient();
  const request = createRequest(args.query, args.variables);

  const [state, setState] = useState<UseSubscriptionState<R>>({
    error: undefined,
    data: undefined,
  });

  const executeSubscription = useCallback(() => {
    subscriptionUnsubscribe();

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

    setSubscriptionUnsubscribe(sub.unsubscribe.bind(sub));
  }, [request.hash]);

  useEffect(() => {
    executeSubscription();
    return subscriptionUnsubscribe;
  }, [request.hash]);

  return [state];
};
