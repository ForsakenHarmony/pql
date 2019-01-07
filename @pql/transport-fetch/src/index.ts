import {
  Ctx,
  GqlTransport,
  graphqlError,
  networkError,
  OperationResult,
  OperationVariables,
} from '@pql/client';
import { Observable } from '@pql/observable';

const createAbortController = () =>
  typeof AbortController === 'undefined'
    ? { abort: null, signal: undefined }
    : new AbortController();

export class FetchTransport implements GqlTransport {
  private readonly fetch: GlobalFetch['fetch'];

  constructor(
    private readonly opts: {
      url: string;
      headers?: { [key: string]: string };
      fetch?: GlobalFetch['fetch'];
    }
  ) {
    this.fetch = opts.fetch || ((typeof fetch !== 'undefined' && fetch) as any);
    if (!this.fetch) throw new Error('Could not find a fetch implementation');
  }

  execute<T, Vars = OperationVariables>(
    ctx: Ctx<Vars>
  ): Observable<OperationResult<T>> {
    return new Observable<OperationResult<T>>(observer => {
      if (ctx.operationType === 'subscription')
        return observer.error(
          networkError(
            new Error('Subscription are not supported with the fetch transport')
          )
        );

      const controller = createAbortController();

      this.fetch(this.opts.url, {
        method: 'POST',
        body: JSON.stringify(ctx.operation),
        headers: Object.assign(this.opts.headers || {}, {
          'Content-Type': 'application/json',
        }),
        signal: controller.signal,
      })
        .then(res => res.json())
        .then(result => {
          Array.isArray(result.errors) && !result.data
            ? observer.error(graphqlError(result.errors))
            : result.data
            ? (observer.next(result), observer.complete())
            : observer.error(networkError(new Error('No data or error')));
        })
        .catch(err => {
          if (err.name !== 'AbortError') observer.error(networkError(err));
        });

      return () => {
        controller.abort && controller.abort();
      };
    });
  }

  close() {
    return Promise.resolve();
  }
}
