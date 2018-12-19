import test, { ThrowsExpectation } from 'ava';
import { testMethodProperty } from './properties';
import { Observable, Observer, SubscriptionObserver } from '../src';

function getObserver<T>(inner: Observer<T> = {}) {
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
  }).subscribe(inner);
  return observer!;
}

test('is a method of SubscriptionObserver', t => {
  let observer = getObserver();
  testMethodProperty(t, Object.getPrototypeOf(observer), 'complete', {
    configurable: true,
    writable: true,
    length: 0,
  });
});

// FIXME?: this is the opposite of the spec tests?
test.skip('does not forward arguments', t => {
  let args;
  let observer = getObserver({
    complete(...a: any[]) {
      args = a;
    },
  });
  observer.complete(1);
  t.deepEqual(args, []);
});
test('forwards the first argument', t => {
  let args;
  let observer = getObserver({
    complete(...a: any[]) {
      args = a;
    },
  });
  // @ts-ignore
  observer.complete(1, 2);
  t.deepEqual(args, [1]);
});

// FIXME?: this is the opposite of the spec tests?
test.skip('does not return a value', t => {
  let observer = getObserver({
    complete() {
      return 1;
    },
  });
  t.is(observer.complete(), undefined);
});
test('returns a value', t => {
  let observer = getObserver({
    complete() {
      return 1;
    },
  });
  t.is(observer.complete(), 1);
});

test('does not forward when the subscription is complete', t => {
  let count = 0;
  let observer = getObserver({
    complete() {
      count++;
    },
  });
  observer.complete();
  observer.complete();
  t.is(count, 1);
});

test('does not forward when the subscription is cancelled', t => {
  let count = 0;
  let observer: SubscriptionObserver<{}>;
  let subscription = new Observable(x => {
    observer = x;
  }).subscribe({
    complete() {
      count++;
    },
  });
  subscription.unsubscribe();
  observer!.complete();
  t.is(count, 0);
});

test('promise resolves when the subscription is cancelled', async t => {
  let list: number[] = [];
  await Observable.of(1,2).forEach((i, cancel) => {
    list.push(i);
    cancel();
  });
  t.deepEqual(list, [1]);
});

// TODO?: we have a sync implementation
test.skip('queues if the subscription is not initialized', async t => {
  let completed = false;
  new Observable(x => {
    x.complete();
  }).subscribe({
    complete() {
      completed = true;
    },
  });
  t.is(completed, false);
  await null;
  t.is(completed, true);
});

// TODO?: we have a sync implementation
test.skip('queues if the observer is running', async t => {
  let observer: SubscriptionObserver<{}>;
  let completed = false;
  new Observable(x => {
    observer = x;
  }).subscribe({
    next() {
      observer.complete();
    },
    complete() {
      completed = true;
    },
  });
  observer!.next();
  t.is(completed, false);
  await null;
  t.is(completed, true);
});

test('closes the subscription before invoking inner observer', t => {
  let closed;
  let observer = getObserver({
    complete() {
      closed = observer.closed;
    },
  });
  observer.complete();
  t.is(closed, true);
});

test('reports error if "complete" is not a method', t => {
  // @ts-ignore
  let observer = getObserver({ complete: 1 });
  t.throws(() => observer.complete(), { instanceOf: TypeError });
});

test('does not report error if "complete" is undefined', t => {
  let observer = getObserver({ complete: undefined });
  t.notThrows(() => observer.complete());
});

test('does not report error if "complete" is null', t => {
  // @ts-ignore
  let observer = getObserver({ complete: null });
  t.notThrows(() => observer.complete());
});

test('reports error if "complete" throws', t => {
  let error = new Error();
  let observer = getObserver({
    complete() {
      throw error;
    },
  });
  t.throws(() => observer!.complete(), { is: error } as ThrowsExpectation);
});

test('calls the cleanup method after "complete"', t => {
  let calls: string[] = [];
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
    return () => {
      calls.push('cleanup');
    };
  }).subscribe({
    complete() {
      calls.push('complete');
    },
  });
  observer!.complete();
  t.deepEqual(calls, ['complete', 'cleanup']);
});

test('calls the cleanup method if there is no "complete"', t => {
  let calls: string[] = [];
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
    return () => {
      calls.push('cleanup');
    };
  }).subscribe({});
  observer!.complete();
  t.deepEqual(calls, ['cleanup']);
});

test('reports error if the cleanup function throws', t => {
  let error = new Error();
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
    return () => {
      throw error;
    };
  }).subscribe({});
  t.throws(() => observer!.complete(), { is: error } as ThrowsExpectation);
});
