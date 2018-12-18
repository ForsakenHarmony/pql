import test from 'ava';
import { Observable, SubscriptionObserver } from '../src';

test('rejects if the argument is not a function', async t => {
  await t.throwsAsync(async () => {
    // @ts-ignore
    await Observable.of(1, 2, 3).forEach();
  }, TypeError);
});

test('rejects if the callback throws', async t => {
  let error = new Error();
  // @ts-ignore
  await t.throwsAsync(
    async () => {
      await Observable.of(1, 2, 3).forEach(_ => {
        throw error;
      });
    },
    { is: error }
  );
});

test('does not execute callback after callback throws', async t => {
  let calls: number[] = [];
  await t.throwsAsync(async () => {
    await Observable.of(1, 2, 3).forEach(x => {
      calls.push(x);
      throw new Error();
    });
  });
  t.deepEqual(calls, [1]);
});

test('rejects if the producer calls error', async t => {
  let error = new Error();
  // @ts-ignore
  await t.throwsAsync(
    async () => {
      let observer: SubscriptionObserver<{}>;
      const promise = new Observable(x => {
        observer = x;
      }).forEach(() => {});
      observer!.error(error);
      await promise;
    },
    { is: error }
  );
});

test('resolves with undefined if the producer calls complete', async t => {
  let observer: SubscriptionObserver<{}>;
  let promise = new Observable(x => {
    observer = x;
  }).forEach(() => {});
  observer!.complete();
  t.is(await promise, undefined);
});

test('provides a cancellation function as the second argument', async t => {
  let results: number[] = [];
  await Observable.of(1, 2, 3).forEach((value, cancel) => {
    results.push(value);
    if (value > 1) {
      return cancel();
    }
  });
  t.deepEqual(results, [1, 2]);
});
