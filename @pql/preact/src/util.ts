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

export function hashOp(op: IOperation<any>) {
  return Client.hash(op.query.query, op.variables || {});
}

export function dEql(param1: any, param2: any) {
  if (param1 === undefined && param2 === undefined) return true;
  else if (param1 === null && param2 === null) return true;
  else if (param1 == null || param2 == null) return false;
  else if (param1.constructor !== param2.constructor) return false;

  if (param1.constructor === Array) {
    if (param1.length !== param2.length) return false;
    for (let i = 0; i < param1.length; i++) {
      if (!dEql(param1[i], param2[i])) return false;
    }
  } else if (param1.constructor === Object) {
    const keys1 = Object.keys(param1);
    if (keys1.length !== Object.keys(param2).length) return false;
    for (let i = 0; i < keys1.length; i++) {
      const key = keys1[i];
      if (!dEql(param1[key], param2[key])) return false;
    }
  } else if (param1.constructor == String || param1.constructor == Number) {
    return param1 === param2;
  }
  return true;
}
