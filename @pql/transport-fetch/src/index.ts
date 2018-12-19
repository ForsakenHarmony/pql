import {
  GqlTransport,
  Operation,
  OperationResult,
  OperationVariables,
} from '@pql/client';
import { Observable } from '@pql/observable';

export function assign(
  obj: { [index: string]: any },
  props: { [index: string]: any },
) {
  for (let i in props) obj[i] = props[i];
  return obj;
}

export class FetchTransport implements GqlTransport {
  private readonly fetch: GlobalFetch['fetch'];

  constructor(private readonly opts: {
    url: string,
    headers?: { [key: string]: string },
    fetch?: GlobalFetch['fetch']
  }) {
    this.fetch = opts.fetch ||
      (typeof window !== 'undefined' && window.fetch) ||
      // @ts-ignore
      (typeof global !== 'undefined' && global.fetch) ||
      (() => {
        throw new Error('Could not find a fetch implementation');
      });
  }

  query<T, Vars = OperationVariables>(
    operation: Operation<Vars>,
  ): Observable<OperationResult<T>> {
    return new Observable(observer => {
      this.fetch(this.opts.url, {
        method: 'POST',
        body: JSON.stringify(operation),
        headers: assign(this.opts.headers || {}, {
          'Content-Type': 'application/json',
        }),
      })
        .then(res => res.text())
        .then(result => {
          try {
            observer.next(JSON.parse(result));
            observer.complete();
          } catch (e) {
            observer.error(e);
          }
        })
        .catch(e => {
          observer.error(e);
        });
    });
  }

  subscribe<T>() {
    return new Observable<OperationResult<T>>(observer => {
      observer.error(
        new Error('Subscription are not supported with the fetch transport'),
      );
    });
  }

  close() {
    return Promise.resolve();
  }
}
