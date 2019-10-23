import { createRequest, PqlError } from '@pql/client';
import { noop, useClient } from './util';
import { useCallback, useEffect, useState } from './deps';
import { UseSubscriptionArgs } from './useSubscription';
import { UseQueryArgs } from './useQuery';

interface UseSubscriptionWithQueryArgs<QV, SV> {
  query: UseQueryArgs<QV>;
  subscription: UseSubscriptionArgs<SV>;
}

type SubscriptionHandler<T, R> = (prev: R, data: T) => R;

interface UseSubscriptionState<T> {
  fetching: boolean;
  data: T | null;
  error: PqlError | null;
}

type UseSubscriptionResponse<T> = [UseSubscriptionState<T>];

export const useSubscriptionWithQuery = <
  T = any,
  R = T,
  QV = object,
  SV = object
>(
  args: UseSubscriptionWithQueryArgs<QV, SV>,
  handler?: SubscriptionHandler<T, R>
): UseSubscriptionResponse<R> => {
  let [queryUnsubscribe, setQueryUnsubscribe] = useState(() => noop);
  let [subscriptionUnsubscribe, setSubscriptionUnsubscribe] = useState(
    () => noop
  );

  const client = useClient();
  const queryRequest = createRequest(args.query.query, args.query.variables);
  const subRequest = createRequest(
    args.subscription.query,
    args.subscription.variables
  );

  const [state, setState] = useState<UseSubscriptionState<R>>({
    fetching: true,
    error: null,
    data: null,
  });

  const executeSubscription = useCallback(() => {
    subscriptionUnsubscribe();

    const sub = client
      .execute<T, SV>({
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

    setSubscriptionUnsubscribe(() => sub.unsubscribe.bind(sub));
  }, [subRequest.hash]);

  const executeQuery = useCallback(() => {
    queryUnsubscribe();
    setState(s => ({ ...s, fetching: true }));

    const sub = client
      .execute<R, QV>({
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

    setQueryUnsubscribe(() => sub.unsubscribe.bind(sub));
  }, [queryRequest.hash]);

  useEffect(() => {
    executeQuery();
    return () => {
      queryUnsubscribe();
      subscriptionUnsubscribe();
    };
  }, [queryRequest.hash, subRequest.hash]);

  return [state];
};
