import {
  GqlTransport,
  MiddlewareFn,
  OperationContext,
  OperationOptions,
  OperationResult,
} from './types';
import { Observable } from '@pql/observable';
import { compose } from './compose';
import { analyzeQuery } from './gql';
import { hashRequest } from './request';

export class Client {
  constructor(
    private transport: GqlTransport,
    private middleware: Array<MiddlewareFn<any, any>> = []
  ) {}

  execute<T, Vars>({
    request: { query, variables, hash },
    extra,
  }: OperationOptions<Vars>): Observable<OperationResult<T>> {
    const { operationType, operationName } = analyzeQuery(query);
    const ctx: OperationContext<Vars> = {
      ...extra,
      hash,
      operation: {
        query,
        variables,
        operationName,
      },
      client: this,
      operationType,
    };

    return compose<Vars, T>(
      ctx,
      this.middleware,
      this.transport.execute.bind<
        GqlTransport,
        OperationContext<Vars>,
        Observable<OperationResult<T>>
      >(this.transport)
    );
  }

  static hash = hashRequest;
}
