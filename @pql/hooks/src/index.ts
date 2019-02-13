import { Client } from '@pql/client';
import { createContext } from 'preact';
import { useContext, useState, useEffect, useCallback } from 'preact/hooks';
import { CtxFactory } from '@pql/client';
import { IOperation } from '@pql/preact';

export const PQLContext = createContext<Client | null>(null);
export const Provider = PQLContext.Provider;
export const Consumer = PQLContext.Consumer;

export function query<Vars>(
  query: CtxFactory<Vars>,
  variables?: Vars
): IOperation<Vars> {
  return { query, variables };
}
export const mutation = query;
export const subscription = query;

// assign<T, U>(target: T, source: U): T & U;
// Lighter Object.assign stand-in
export function assign<T, U>(target: T, source: U): T & U {
  // @ts-ignore
  for (let i in source) target[i] = source[i];
  return target as T & U;
}

export function useClient(): Client {
  const client = useContext<Client | null>(PQLContext);
  if (!client) throw new Error('No pql client in context');
  return client;
}

interface QueryState {
  error?: any;
  loading: boolean;
}

function useInvalidation<Vars>(queries: IOperation<Vars>[], cb: Function) {
  const client = useClient();
  const hashes = queries.map(({ query, variables }) =>
    Client.hash(query.query, variables)
  );

  useEffect(() => {
    let cleanup = cb();
    const unsub = client.onInvalidate(
      hash =>
        hashes.includes(hash) &&
        (typeof cleanup === 'function' && cleanup(), cb())
    );
    return () => {
      unsub();
      typeof cleanup === 'function' && cleanup();
    };
  }, hashes);
}

export function useQuery<T extends {}, Vars>(
  query: IOperation<Vars>
): QueryState & T {
  const client = useClient();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useInvalidation([query], () => {
    setLoading(true);
    client
      .query<T, Vars>(query)
      .then(({ data, error }) => {
        setData(data);
        setError(error);
        setLoading(false);
      })
      .catch(error => {
        setError(error);
        setLoading(false);
      });
  });

  return assign(
    {
      error,
      loading,
    },
    data
  );
}

interface MutationState<T, Vars> {
  data: T | null;
  error?: any;
  loading: boolean;
  mutate: (variables: Vars) => void;
}

export function useMutation<T, Vars>(
  mutation: IOperation<Vars>
): MutationState<T, Vars> {
  const client = useClient();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  function mutate(variables: Vars) {
    setLoading(true);
    return client
      .query<T, Vars>({
        query: mutation.query,
        variables,
      })
      .then(({ data, error }) => {
        setData(data);
        setError(error);
        setLoading(false);
      })
      .catch(error => {
        setError(error);
        setLoading(false);
      });
  }

  return {
    data,
    error,
    loading,
    mutate,
  };
}

interface SubscriptionOpts<QData, SData, OData, QVars, SVars> {
  query: IOperation<QVars>;
  subscription: IOperation<SVars>;
  updateData: (data: QData, next?: SData) => OData;
}

interface SubscriptionState<T> {
  data: T | null;
  error?: any;
  loading: boolean;
  stopped: boolean;
  stop: () => void;
}

export function useSubscription<QData, SData, OData, QVars, SVars>({
  query,
  subscription,
  updateData,
}: SubscriptionOpts<QData, SData, OData, QVars, SVars>): SubscriptionState<
  OData
> {
  const client = useClient();

  const [data, setData] = useState<OData | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [stopped, setStopped] = useState<boolean>(false);

  let stopsub = () => {};

  const stop = useCallback(() => {
    setStopped(true);
    stopsub();
  }, []);

  useInvalidation([query], () => {
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await client.query<QData, QVars>(query);
        if (stopped) return;
        data && setData(updateData(data));
        error && setError(error);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        return setError(err);
      }
      if (stopped) return;
      try {
        await client
          .subscribe<SData, SVars>(subscription)
          .forEach((res, cancel) => {
            stopsub = cancel;
            res.error && setError(res.error);
          });
      } catch (err) {
        setStopped(true);
        setError(err);
      }
    })();
    return () => {
      stop();
    };
  });

  return {
    data,
    error,
    loading,
    stopped,
    stop,
  };
}
