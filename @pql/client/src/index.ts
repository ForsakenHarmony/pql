import {
  Ctx,
  CtxFactory,
  GqlTransport,
  MiddlewareFn,
  OperationResult,
  OperationVariables,
  OperationOptions,
} from './types';
import { Observable } from '@pql/observable';
import { GraphQLError } from 'graphql';
import { hashStr } from './hash';

export * from './types';

function compose<Vars extends OperationVariables, Res>(
  ctx: Ctx<Vars>,
  middleware: Array<MiddlewareFn<Vars, Res>>,
  exec: (ctx: Ctx<Vars>) => Observable<OperationResult<Res>>
): Observable<OperationResult<Res>> {
  let index = 0;
  let lastCtx = ctx;

  function next(ctx: Ctx<Vars> = lastCtx): Observable<OperationResult<Res>> {
    lastCtx = ctx;
    if (index >= middleware.length) {
      return exec(ctx);
    }
    return middleware[index++](ctx, next);
  }

  return next(ctx);
}

export interface Subsciber {
  (hash: string): void;
}

export class Client {
  private allHashes: string[] = [];
  private subscribers: Subsciber[] = [];

  constructor(
    private transport: GqlTransport,
    private middleware: Array<MiddlewareFn<any, any>> = []
  ) {}

  query = this.run;
  mutate = this.run;
  private run<T, Vars = {}>({
    query,
    variables,
    extra,
  }: OperationOptions<Vars>): Promise<OperationResult<T>> {
    return new Promise((res, rej) => {
      const operation = query(this, extra, variables);

      if (operation.operationType === 'subscription')
        return rej(
          networkError(new PqlError("You can't query a subscription"))
        );

      this.subscribe<T, Vars>({
        query,
        variables,
        extra,
      }).subscribe({
        next: res,
        error: rej,
        complete: rej.bind(
          null,
          networkError(new Error("Transport didn't return any value"))
        ),
      });
    });
  }

  subscribe<T, Vars>({
    query,
    variables,
    extra,
  }: OperationOptions<Vars>): Observable<OperationResult<T>> {
    const operation = query(this, extra, variables);

    if (operation.operationType === 'query')
      this.allHashes.push(operation.hash);

    return compose<Vars, T>(
      operation,
      this.middleware,
      this.transport.execute.bind<
        GqlTransport,
        [Ctx<Vars>],
        Observable<OperationResult<T>>
      >(this.transport)
    );
  }

  invalidate(hash: string) {
    this.subscribers.map(fn => fn(hash));
  }
  invalidateAll() {
    this.allHashes.map(hash => this.subscribers.map(fn => fn(hash)));
  }
  onInvalidate(cb: Subsciber) {
    this.subscribers.push(cb);
    return () => {
      this.subscribers.splice(this.subscribers.indexOf(cb), 1);
    };
  }

  static hash(query: string, variables: any = {}): string {
    return hashStr(JSON.stringify({ query, variables })).toString(16);
  }
}

export class PqlError extends Error {
  constructor(
    errorMessage?: string,
    public graphQLErrors: ReadonlyArray<GraphQLError> = [],
    public networkError?: Error
  ) {
    super(
      errorMessage ||
        (
          graphQLErrors
            .map(
              e => `GraphQL error: ${e.message || 'Error message not found.'}`
            )
            .join('\n') +
          (networkError ? `Network error: ${networkError!.message}` : '')
        ).trim()
    );
  }
}

export function graphqlError(graphQLErrors: ReadonlyArray<GraphQLError>) {
  return new PqlError(
    void 0,
    Array.isArray(graphQLErrors) ? graphQLErrors : [graphQLErrors]
  );
}

export function networkError(networkError: Error) {
  return new PqlError(void 0, void 0, networkError);
}

const getOpname = /^(?:(query|mutation|subscription)(?:\s+([_A-Za-z][_0-9A-Za-z]*))?[^{]*?\s*)?{/;
export function gql<Vars extends OperationVariables>(
  str: string | TemplateStringsArray
): CtxFactory<Vars> {
  const query = (Array.isArray(str) ? str.join('') : <string>str).trim();
  const res = getOpname.exec(query);
  if (!res) throw new PqlError('Could not parse the query');
  const factory = function(
    client: Client,
    extra: object = {},
    variables: Vars = {} as Vars
  ) {
    const hash = Client.hash(query, variables);
    return Object.assign(extra, {
      client,
      hash,
      operationType: (res[1] as any) || 'query',
      operation: {
        query,
        operationName: res[2],
        variables,
      },
    });
  };
  factory.query = query;
  return factory;
}
