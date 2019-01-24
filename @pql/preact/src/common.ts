import { Client, CtxFactory, OperationResult } from '@pql/client';

interface RunQueryOpts<T, Vars, OT = T> {
  query: CtxFactory<Vars>;
  variables?: Vars;
  data: OT | null;
  updateQuery?: (data: OT | null, next: T) => OT;
  skipCache?: boolean;
}

export function runQuery<T, Vars, OT = T>(
  client: Client,
  { query, variables, data, updateQuery, skipCache }: RunQueryOpts<T, Vars, OT>
): Promise<{ data: OT | null; error?: any }> {
  return client
    .query<T, Vars>({
      query: query,
      variables: variables,
      extra: {
        skipCache,
      },
    })
    .then(res => {
      return {
        data:
          res.data && updateQuery
            ? updateQuery(data, res.data)
            : ((res.data as unknown) as OT),
        error: res.error,
      };
    })
    .catch(err => {
      return {
        data: null,
        error: err,
      };
    });
}

interface RunMutationOpts<T, Vars> {
  query: CtxFactory<Vars>;
  variables?: Vars;
  update?: (data: T) => T;
}

export function runMutation<T, Vars>(
  client: Client,
  { query, variables, update }: RunMutationOpts<T, Vars>
): Promise<{ data: T | null; error?: any }> {
  return client
    .mutate<T, Vars>({
      query: query,
      variables: variables,
    })
    .then(res => {
      return {
        data: res.data && update ? update(res.data) : res.data,
        error: res.error,
      };
    })
    .catch(err => {
      return {
        data: null,
        error: err,
      };
    });
}

interface RunMutationOpts<T, Vars> {
  query: CtxFactory<Vars>;
  variables?: Vars;
}

export function runSubscription<T, Vars>(
  client: Client,
  { query, variables }: RunMutationOpts<T, Vars>,
  cb: (res: { data: T | null; error?: any }, stop: Function) => void
): Promise<void> {
  return new Promise((res, rej) => {
    let unsubbed = false;
    let unsub = () => {
      unsubbed = true;
    };
    const sub = client
      .subscribe<T, Vars>({
        query: query,
        variables: variables,
      })
      .subscribe({
        next(value: OperationResult<T>): void {
          cb(value, unsub);
        },
        error(error: any): void {
          rej(error);
          cb({ error, data: null }, unsub);
        },
        complete: res,
      });
    unsub = () => {
      unsubbed = true;
      sub.unsubscribe();
      res();
    };
    unsubbed && unsub();
    cb({ error: null, data: null }, unsub);
  });
}
