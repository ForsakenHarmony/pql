import { Client } from '@pql/client';
import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { CtxFactory } from '@pql/client';

export const PQLContext = createContext<Client | null>(null);
export const Provider = PQLContext.Provider;
export const Consumer = PQLContext.Consumer;

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

export function useQuery<T extends {}, Vars>(
  query: CtxFactory<Vars>,
  variables?: Vars
): QueryState & T {
  const client = useClient();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    client
      .query<T, Vars>({
        query,
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
  }, []);

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
  mutation: CtxFactory<Vars>
): MutationState<T, Vars> {
  const client = useClient();

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  function mutate(variables: Vars) {
    setLoading(true);
    client
      .query<T, Vars>({
        query: mutation,
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
