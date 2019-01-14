import { IOperation } from './index';
import { Client } from '@pql/client';

export interface Obj {
  [key: string]: any;
}

export type Without<T, K> = Pick<T, Exclude<keyof T, keyof K>>;

export const EMPTY_OBJECT = {};

export function noop() {}

// assign<T, U>(target: T, source: U): T & U;
// Lighter Object.assign stand-in
export function assign<T, U>(target: T, source: U): T & U {
  // @ts-ignore
  for (let i in source) target[i] = source[i];
  return target as T & U;
}

export function overrideOp<
  S extends IOperation<any>,
  O extends Partial<IOperation<any>>
>(source: S, override?: O): IOperation<any> {
  return override
    ? {
        query: override.query || source.query,
        variables: override.variables || source.variables,
      }
    : source;
}

export function opsEqual<
  S extends IOperation<any>,
  O extends Partial<IOperation<any>>
>(source?: S, target?: O) {
  return (
    source === target ||
    (source &&
      target &&
      source.query === target.query &&
      source.variables === target.variables)
  );
}

export function hashOp(op: IOperation<any>) {
  return Client.hash(op.query.query, op.variables || {});
}
