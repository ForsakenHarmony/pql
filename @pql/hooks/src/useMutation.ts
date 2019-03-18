import { createRequest, OperationResult, PqlError } from '@pql/client';
import { useClient } from './util';
import { useState } from 'preact/hooks';

interface UseMutationState<T> {
  fetching: boolean;
  data?: T;
  error?: PqlError;
}

type UseMutationResponse<T, V> = [
  UseMutationState<T>,
  (variables?: V) => Promise<OperationResult<T>>
];

export const useMutation = <T = any, V = object>(
  query: string
): UseMutationResponse<T, V> => {
  const client = useClient();
  const [state, setState] = useState<UseMutationState<T>>({
    fetching: false,
    error: undefined,
    data: undefined,
  });

  const executeMutation = (variables?: V) => {
    setState({ fetching: true, error: undefined, data: undefined });

    const request = createRequest(query, variables);
    return client
      .execute<T, V>({ request })
      .toPromise()
      .then(result => {
        const { data, error } = result;
        setState({ fetching: false, data, error });
        return result;
      });
  };

  return [state, executeMutation];
};
