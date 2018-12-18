import {
  GqlTransport,
  MiddlewareFn,
  MutationOptions,
  Operation,
  OperationFactory,
  OperationResult,
  OperationVariables,
  QueryOptions,
  SubscriptionOptions,
} from './types';
import { Observable } from '@pql/observable';

export * from './types';

function compose<Ctx, Res>(
  ctx: Ctx,
  middleware: Array<MiddlewareFn<Ctx, Res>>,
  exec: (ctx: Ctx) => Observable<Res>
): Observable<Res> {
  let index = 0;
  let lastCtx = ctx;

  function next(ctx: Ctx = lastCtx): Observable<Res> {
    lastCtx = ctx;
    if (index >= middleware.length) {
      return exec(ctx);
    }
    return middleware[index++](ctx, next);
  }

  return next(ctx);
}

export default class Client {
  constructor(
    private transport: GqlTransport,
    private middleware: Array<MiddlewareFn<any, OperationResult<any>>> = []
  ) {}

  async query<T, Vars>({
    query,
    variables,
  }: QueryOptions<Vars>): Promise<OperationResult<T>> {
    const op: Operation<Vars> = query<Vars>(variables);
    return this.run<T, Vars>(op);
  }

  async mutate<T, Vars>({
    mutation,
    variables,
  }: MutationOptions<Vars>): Promise<OperationResult<T>> {
    const op: Operation<Vars> = mutation<Vars>(variables);
    return this.run<T, Vars>(op);
  }

  private async run<T, Vars>(
    operation: Operation<Vars>
  ): Promise<OperationResult<T>> {
    let res: OperationResult<T> | undefined;

    await compose(
      operation,
      this.middleware,
      this.transport.query
    ).forEach((val: OperationResult<T>, cancel) => {
      res = val;
      cancel();
    });

    if (!res) throw new Error("Transport didn't return any value");

    return res;
  }

  subscribe<T, Vars>({
    subscription,
    variables,
  }: SubscriptionOptions<T, Vars>): Observable<OperationResult<T>> {
    const op: Operation<Vars> = subscription<Vars>(variables);

    return this.transport.subscribe<T, Vars>(op);
  }
}

const getOpname = /(query|mutation|subsciption) ?([\w\d-_]+)? ?\(.*?\)? {/;

export function gql(str: string): OperationFactory {
  str = Array.isArray(str) ? str.join('') : str;
  const name = getOpname.exec(str);

  return function<Variables = OperationVariables>(
    variables?: Variables
  ): Operation<Variables> {
    const data: Operation<Variables> = { query: str };

    if (variables) data.variables = variables;
    if (name && name.length) {
      const operationName = name[2];
      if (operationName) data.operationName = name[2];
    }

    return data;
  };
}
