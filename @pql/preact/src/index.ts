import { CtxFactory } from '@pql/client';

export * from './provider';
export * from './query';
export * from './with-mutation';
export * from './with-subscription';
export * from './connect';

export interface IOperation<Vars> {
  query: CtxFactory<Vars>;
  variables?: Vars;
}

export function query<Vars>(
  query: CtxFactory<Vars>,
  variables?: Vars
): IOperation<Vars> {
  return { query, variables };
}
export const mutation = query;
export const subscription = query;
