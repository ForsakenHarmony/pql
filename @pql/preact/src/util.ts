export interface Obj {
  [key: string]: any;
}

export const EMPTY_OBJECT = {};

export function noop() {}

// assign<T, U>(target: T, source: U): T & U;
// Lighter Object.assign stand-in
export function assign<T, U>(target: T, source: U): T & U {
  // @ts-ignore
  for (let i in source) target[i] = source[i];
  return target as T & U;
}
