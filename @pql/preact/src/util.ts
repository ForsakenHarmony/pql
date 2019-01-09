import { IOperation } from './index';

export interface Obj {
  [key: string]: any;
}

export type Without<T, K> = Pick<T, Exclude<keyof T, K>>;

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
