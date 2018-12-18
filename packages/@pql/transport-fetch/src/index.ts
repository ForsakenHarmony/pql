import {
  GqlTransport,
  Operation,
  OperationResult,
  OperationVariables,
  TransportOptions,
} from '@pql/client';
import { Observable } from '@pql/observable';

export function assign(
  obj: { [index: string]: any },
  props: { [index: string]: any }
) {
  for (let i in props) obj[i] = props[i];
  return obj;
}

export class FetchTransport implements GqlTransport {
  constructor(private readonly opts: TransportOptions) {}

  query<T, Vars = OperationVariables>(
    operation: Operation<Vars>
  ): Observable<OperationResult<T>> {
    return new Observable(async observer => {
      try {
        const res = await window.fetch(this.opts.url, {
          body: JSON.stringify(operation),
          headers: assign(this.opts.headers || {}, {
            'Content-Type': 'application/json',
          }),
        });
        const result: OperationResult<T> = await res.json();
        observer.next(result);
        observer.complete();
      } catch (e) {
        observer.error(e);
      }
    });
  }

  subscribe<T>() {
    return new Observable<OperationResult<T>>(observer => {
      observer.error(
        new Error('Subscription are not supported with the fetch transport')
      );
    });
  }

  close() {
    return Promise.resolve();
  }
}
