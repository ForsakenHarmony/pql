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

function compose<Vars extends OperationVariables, Res>(
  ctx: Operation<Vars>,
  middleware: Array<MiddlewareFn<Vars, Res>>,
  exec: (ctx: Operation<Vars>) => Observable<OperationResult<Res>>
): Observable<OperationResult<Res>> {
  let index = 0;
  let lastCtx = ctx;

  function next(
    ctx: Operation<Vars> = lastCtx
  ): Observable<OperationResult<Res>> {
    lastCtx = ctx;
    if (index >= middleware.length) {
      return exec(ctx);
    }
    return middleware[index++](ctx, next);
  }

  return next(ctx);
}

export class Client {
  constructor(
    private transport: GqlTransport,
    private middleware: Array<MiddlewareFn<any, any>> = []
  ) {}

  query<T, Vars = {}>({
    query,
    variables,
  }: QueryOptions<Vars>): Promise<OperationResult<T>> {
    const op = query(variables);
    return this.run<T, Vars>(op);
  }

  mutate<T, Vars = {}>({
    mutation,
    variables,
  }: MutationOptions<Vars>): Promise<OperationResult<T>> {
    const op = mutation(variables);
    return this.run<T, Vars>(op);
  }

  private run<T, Vars>(
    operation: Operation<Vars>
  ): Promise<OperationResult<T>> {
    let res: OperationResult<T> | undefined;
    return compose(
      operation,
      this.middleware,
      this.transport.query.bind(this.transport)
    )
      .forEach((val: OperationResult<T>, cancel: () => void) => {
        res = val;
        cancel();
      })
      .then(() => {
        if (!res) throw new Error("Transport didn't return any value");
        return res;
      });
  }

  subscribe<T, Vars>({
    subscription,
    variables,
  }: SubscriptionOptions<T, Vars>): Observable<OperationResult<T>> {
    const op = subscription(variables);

    return compose<Vars, T>(
      op,
      this.middleware,
      this.transport.subscribe.bind(this.transport) as any
    );
  }
}

const getOpname = /(query|mutation|subsciption) ?([\w\d-_]+)? ?\(.*?\)? {/;

export function gql<Vars extends OperationVariables>(
  str: string | TemplateStringsArray
): OperationFactory<Vars> {
  const query = Array.isArray(str) ? str.join('') : <string>str;
  const name = getOpname.exec(query);

  return function(variables?: Vars): Operation<Vars> {
    const data: Operation<Vars> = { query };

    if (variables) data.variables = variables;
    if (name && name.length) {
      const operationName = name[2];
      if (operationName) data.operationName = name[2];
    }

    return data;
  };
}
