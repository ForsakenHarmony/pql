import { MiddlewareFn, OperationContext, OperationResult, Obj } from './types';
import { Observable } from '@pql/observable';

export function compose<Vars extends Obj, Res>(
  ctx: OperationContext<Vars>,
  middleware: Array<MiddlewareFn<Vars, Res>>,
  exec: (ctx: OperationContext<Vars>) => Observable<OperationResult<Res>>
): Observable<OperationResult<Res>> {
  let index = 0;
  let lastCtx = ctx;

  function next(
    ctx: OperationContext<Vars> = lastCtx
  ): Observable<OperationResult<Res>> {
    lastCtx = ctx;
    if (index >= middleware.length) {
      return exec(ctx);
    }
    return middleware[index++](ctx, next);
  }

  return next(ctx);
}
