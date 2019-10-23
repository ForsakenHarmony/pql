import {
  Obj,
  GqlTransport,
  graphqlError,
  networkError,
  OperationContext,
  OperationResult,
} from '@pql/client';
import { Observable } from '@pql/observable';

const createAbortController = () =>
  typeof AbortController === 'undefined'
    ? { abort: null, signal: undefined }
    : new AbortController();

export class FetchTransport implements GqlTransport {
  private readonly fetch: typeof fetch;

  constructor(
    private opts: {
      url: string;
      headers?: { [key: string]: string };
      fetch?: typeof fetch;
    }
  ) {
    this.fetch = opts.fetch || ((typeof fetch !== 'undefined' && fetch) as any);
    if (!this.fetch) throw new Error('Could not find a fetch implementation');
  }

  execute<T = Obj, Vars = {}>(
    ctx: OperationContext<Vars>
  ): Observable<OperationResult<T>> {
    return new Observable<OperationResult<T>>(observer => {
      if (ctx.operationType === 'subscription')
        return observer.error(
          networkError(
            new Error('Subscription are not supported with the fetch transport')
          )
        );

      const controller = createAbortController();

      // fix illegal invocation
      const fetch = this.fetch;
      fetch(this.opts.url, {
        method: 'POST',
        body: JSON.stringify(ctx.operation),
        headers: Object.assign(this.opts.headers || {}, {
          'Content-Type': 'application/json',
        }),
        signal: controller.signal,
      })
        .then(res => res.json())
        .then(result => {
          if (result.data) {
            observer.next({
              data: result.data,
              error: result.errors ? graphqlError(result.errors) : null,
            });
            observer.complete();
          } else if (Array.isArray(result.errors)) {
            observer.error(graphqlError(result.errors));
          } else {
            observer.error(networkError(new Error('No data or error')));
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') observer.error(networkError(err));
        });

      return () => {
        controller.abort && controller.abort();
      };
    });
  }

  setHeaders(headers: Obj): void {
    this.opts.headers = headers;
  }

  close() {
    return Promise.resolve();
  }
}
