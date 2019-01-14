import { MiddlewareFn, GqlData } from '@pql/client';
import { Observable } from '@pql/observable';

export interface ICacheStorage {
  read(hash: any): Promise<any>;

  write(hash: any, value: any): Promise<any>;

  invalidate(hash: any): Promise<any>;

  invalidateAll(): Promise<any>;
}

interface InvalidationMap {
  [key: string]: {
    [key: string]: string[];
  };
}

function invalidateDepsFromInvalidationMap(
  invalidationMap: InvalidationMap,
  data: GqlData,
  hash: string
): string[] {
  const hashes: string[] = [];
  if (typeof data.__typename === 'string' && data.id) {
    const k = data.__typename;
    const typeMap = invalidationMap[k] || (invalidationMap[k] = {});
    (typeMap[data.id] || [])
      .splice(0)
      .map(hash => !hashes.includes(hash) && hashes.push(hash));
  }

  const values = Object.values(data);

  while (values.length > 0) {
    const val = values.pop();

    if (Array.isArray(val)) values.push.apply(values, val);
    else if (val && typeof val === 'object')
      invalidateDepsFromInvalidationMap(invalidationMap, val, hash).map(
        hash => !hashes.includes(hash) && hashes.push(hash)
      );
  }

  return hashes;
}

function addDepsToInvalidationMap(
  invalidationMap: InvalidationMap,
  data: GqlData,
  hash: string
) {
  if (typeof data.__typename === 'string' && data.id) {
    const k = data.__typename;
    const typeMap = invalidationMap[k] || (invalidationMap[k] = {});
    (typeMap[data.id] || (typeMap[data.id] = [])).push(hash);
  }

  const values = Object.values(data);

  while (values.length > 0) {
    const val = values.pop();

    if (Array.isArray(val)) values.push.apply(values, val);
    else if (val && typeof val === 'object')
      addDepsToInvalidationMap(invalidationMap, val, hash);
  }
}

export function cache(storage: ICacheStorage): MiddlewareFn<any, any> {
  const invalidationMap: InvalidationMap = {};
  return (ctx, next) => {
    const { hash, skipCache, operationType, client } = ctx;
    const isQuery = operationType === 'query';
    const isSubscription = operationType === 'subscription';

    return new Observable(observer => {
      (skipCache || !isQuery
        ? Promise.resolve(undefined)
        : storage.read(hash).catch(() => void 0)
      ).then(data => {
        if (data) {
          observer.next({ data });
          return observer.complete();
        }

        next(ctx)
          .map(res => {
            try {
              if (res.data) {
                if (isQuery) {
                  storage.write(hash, res.data);
                  addDepsToInvalidationMap(invalidationMap, res, hash);
                } else if (isSubscription) {
                  addDepsToInvalidationMap(invalidationMap, res, hash);
                } else {
                  invalidateDepsFromInvalidationMap(
                    invalidationMap,
                    res,
                    hash
                  ).map(
                    hash => storage.invalidate(hash) && client.invalidate(hash)
                  );
                }
              }
            } catch (e) {
              // we don't want to fuck over other stuff when the cache dies
              console.error('Cache Error: ', e);
            }
            return res;
          })
          .subscribe(observer);
      });
    });
  };
}

export class DefaultStorage implements ICacheStorage {
  private cache: { [hash: string]: any };

  constructor(initial?: { [hash: string]: any }) {
    this.cache =
      typeof initial === 'object' && !Array.isArray(initial) ? initial : {};
  }

  read(hash: any) {
    return Promise.resolve(this.cache[hash]);
  }

  write(hash: any, value: any) {
    return new Promise(resolve => {
      this.cache[hash] = value;
      resolve(hash);
    });
  }

  invalidate(hash: any) {
    return new Promise(resolve => {
      delete this.cache[hash];
      resolve(hash);
    });
  }

  invalidateAll() {
    return Promise.resolve((this.cache = {}));
  }
}
