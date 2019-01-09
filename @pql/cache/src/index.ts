import { MiddlewareFn } from '@pql/client';
import { hashStr } from './hash';
import { Observable } from '@pql/observable';

export interface ICacheStorage {
  read(hash: any): Promise<any>;

  write(hash: any, value: any): Promise<any>;

  invalidate(hash: any): Promise<any>;

  invalidateAll(): Promise<any>;
}

export function cache(storage: ICacheStorage): MiddlewareFn<any, any> {
  return (ctx, next) => {
    const { query, variables } = ctx;

    const hash = hashStr(JSON.stringify({ query, variables }));

    return new Observable(observer => {
      storage
        .read(hash)
        .catch(() => void 0)
        .then(entry => {
          if (entry) {
            observer.next(entry);
            observer.complete();
          } else {
            next(ctx)
              .map(res => {
                storage.write(hash, res).catch(() => {});
                return res;
              })
              .subscribe(observer);
          }
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
