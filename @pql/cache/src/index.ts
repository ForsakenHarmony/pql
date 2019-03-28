import {
  Obj,
  MiddlewareFn,
  OperationResult,
  OperationContext,
} from '@pql/client';
import { Observable, SubscriptionObserver } from '@pql/observable';

export interface ICacheStorage {
  read(hash: any): Promise<any>;

  write(hash: any, value: any): Promise<any>;

  invalidate(hash: any): Promise<any>;

  invalidateAll(): Promise<any>;
}

// type -> id -> hash
interface InvalidationMap {
  [type: string]: {
    [id: string]: string[];
  };
}

function invalidateDepsFromInvalidationMap(
  invalidationMap: InvalidationMap,
  data: Obj,
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
  data: Obj,
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

interface HashCacheMap {
  [hash: string]: {
    ctx: OperationContext<any>;
    next: (ctx: OperationContext<any>) => Observable<OperationResult<any>>;
    observers: SubscriptionObserver<OperationResult<any>>[];
  };
}

export function cache(storage: ICacheStorage): MiddlewareFn<any, any> {
  const invalidationMap: InvalidationMap = {};
  const hashCache: HashCacheMap = {};

  function fetchQuery(hash: string) {
    const { ctx, next, observers } = hashCache[hash];
    next(ctx).subscribe({
      next(res) {
        const { data } = res;
        if (data) {
          storage.write(ctx.hash, data);
          addDepsToInvalidationMap(invalidationMap, data, ctx.hash);
        }
        observers.map(obs => {
          obs.next(res);
        });
      },
      error(error) {
        observers.map(obs => {
          obs.next({ error, data: null });
        });
      },
    });
  }

  return (ctx, next) => {
    const { hash, skipCache, operationType } = ctx;
    const isQuery = operationType === 'query';
    const isSubscription = operationType === 'subscription';
    const cache =
      hashCache[hash] || (hashCache[hash] = { ctx, next, observers: [] });

    return new Observable(observer => {
      if (isQuery) cache.observers.push(observer);

      const prom =
        skipCache || !isQuery
          ? Promise.resolve(undefined)
          : storage.read(hash).catch(() => void 0);

      prom.then(data => {
        if (data) {
          observer.next({ data, error: null });
          return;
        }

        if (isQuery) {
          fetchQuery(hash);
        } else {
          next(ctx)
            .map(res => {
              const { data } = res;
              if (data) {
                if (isSubscription) {
                  addDepsToInvalidationMap(invalidationMap, data, hash);
                } else {
                  invalidateDepsFromInvalidationMap(
                    invalidationMap,
                    data,
                    hash
                  ).map(hash => {
                    storage.invalidate(hash);
                    fetchQuery(hash);
                  });
                }
              }
              return res;
            })
            .subscribe(observer);
        }
      });

      return () => {
        observer.complete();
        isQuery && cache.observers.splice(cache.observers.indexOf(observer), 1);
      };
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
