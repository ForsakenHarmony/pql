import { GraphQLError } from 'graphql';
import { Observable } from '@pql/observable';

export type OperationFactory = <Vars = OperationVariables>(
  vars?: Vars
) => Operation<Vars>;

export type Operation<Variables = OperationVariables> = {
  query: string;
  operationName?: string;
  variables?: Variables;
};

export type OperationVariables = {
  [key: string]: any;
};

export interface OperationOptions<Variables = OperationVariables> {
  variables?: Variables;
}

export interface QueryOptions<Variables = OperationVariables>
  extends OperationOptions<Variables> {
  query: OperationFactory;
}

export interface MutationOptions<Variables = OperationVariables>
  extends OperationOptions<Variables> {
  mutation: OperationFactory;
}

export interface SubscriptionOptions<T, Variables = OperationVariables>
  extends OperationOptions<Variables> {
  subscription: OperationFactory;
  handler: (data?: T, err?: any) => void;
}

export type OperationResult<T> = {
  data: T | null;
  errors: GraphQLError[];
};

export type MiddlewareFn<Ctx, Res> = (
  ctx: Ctx,
  next: (ctx: Ctx) => Observable<Res>
) => Observable<Res>;

export type ClientOptions = {
  transport: GqlTransport;
  middleware: Array<MiddlewareFn<any, any>>;
};

export type Client = {
  query<T, Vars = OperationVariables>(
    options: QueryOptions<Vars>
  ): Promise<OperationResult<T>>;
  mutate<T, Vars = OperationVariables>(
    options: MutationOptions<Vars>
  ): Promise<OperationResult<T>>;
  subscribe<T, Vars = OperationVariables>(
    options: SubscriptionOptions<T, Vars>
  ): Promise<() => void>;
};

export interface GqlTransport {
  query<T, Vars = OperationVariables>(
    operation: Operation<Vars>
  ): Observable<OperationResult<T>>;
  subscribe<T, Vars = OperationVariables>(
    operation: Operation<Vars>
  ): Observable<OperationResult<T>>;
  close(): Promise<void>;
}

export type TransportOptions = {
  url: string;
  headers?: { [index: string]: string };
};
