import { Observable } from '@pql/observable';
import { Client, PqlError } from './index';
import { GqlRequest } from './request';

export type Obj = {
  [key: string]: any;
};

export interface Operation<Vars = {}> {
  query: string;
  operationName?: string;
  variables?: Vars;
}

export interface OperationContext<Vars = {}> {
  hash: string;
  operationType: 'query' | 'mutation' | 'subscription';
  operation: Operation<Vars>;
  client: Client;

  // extra
  [key: string]: any;
}

export interface OperationOptions<Vars = {}> {
  request: GqlRequest<Vars>;
  extra?: Obj;
}

export interface OperationResult<T = Obj> {
  data?: T;
  error?: PqlError;

  // extra
  [key: string]: any;
}

export type MiddlewareFn<Vars, Res> = (
  ctx: OperationContext<Vars>,
  next: (ctx: OperationContext<Vars>) => Observable<OperationResult<Res>>
) => Observable<OperationResult<Res>>;

export interface GqlTransport {
  execute<T = Obj, Vars = {}>(
    operation: OperationContext<Vars>
  ): Observable<OperationResult<T>>;

  close(): Promise<void>;
}
