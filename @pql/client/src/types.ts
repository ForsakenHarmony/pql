import { GraphQLError } from 'graphql';
import { Observable } from '@pql/observable';
import { Client } from './index';

export type Obj = {
  [key: string]: any;
};
export type OperationVariables = Obj;

export interface Operation<Vars extends OperationVariables> {
  query: string;
  operationName?: string;
  variables?: Vars;
}

export interface Ctx<Vars extends OperationVariables> {
  hash: string;
  operationType: 'query' | 'mutation' | 'subscription';
  operation: Operation<Vars>;
  client: Client;
  // extra
  [key: string]: any;
}

export type CtxFactory<Vars extends OperationVariables> = (
  client: Client,
  extra?: Obj,
  vars?: Vars
) => Ctx<Vars>;

export interface OperationOptions<Vars = OperationVariables> {
  variables?: Vars;
  query: CtxFactory<Vars>;
  extra?: Obj;
}

export interface OperationError {
  graphql: GraphQLError[];
}

export interface OperationResult<T> {
  data: T | null;
  error?: OperationError;
  // extra
  [key: string]: any;
}

export type MiddlewareFn<Vars, Res> = (
  ctx: Ctx<Vars>,
  next: (ctx: Ctx<Vars>) => Observable<OperationResult<Res>>
) => Observable<OperationResult<Res>>;

export interface GqlTransport {
  execute<T, Vars = OperationVariables>(
    operation: Ctx<Vars>
  ): Observable<OperationResult<T>>;
  close(): Promise<void>;
}
