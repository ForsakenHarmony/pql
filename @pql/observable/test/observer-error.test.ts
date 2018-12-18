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
  testMethodProperty(t, Object.getPrototypeOf(observer), 'error', {
    configurable: true,
    writable: true,
    length: 1,
  });
});

test('forwards the argument', t => {
  let args;
  let observer = getObserver({
    error(...a: number[]) {
      args = a;
    },
  });
  observer.error(1);
  t.deepEqual(args, [1]);
});

// FIXME?: this is the opposite of the spec tests?
test.skip('does not return a value', t => {
  let observer = getObserver({
    error() {
      return 1;
    },
  });
  t.is(observer.error(), undefined);
});
test('returns a value', t => {
  let observer = getObserver({
    error() {
      return 1;
    },
  });
  t.is(observer.error(), 1);
});

// FIXME?: this is the opposite of the spec tests?
test.skip('does not throw when the subscription is complete', t => {
  let observer = getObserver({
    error() {},
  });
  observer.complete();
  t.notThrows(() => observer.error('error'));
});
test('throws when the subscription is complete', t => {
  let error = new Error();
  let observer = getObserver({
    error() {},
  });
  observer.complete();
  t.throws(() => observer.error(error), { is: error });
});

// FIXME?: this is the opposite of the spec tests?
test.skip('does not throw when the subscription is cancelled', t => {
  let observer: SubscriptionObserver<{}>;
  let subscription = new Observable(x => {
    observer = x;
  }).subscribe({
    error() {},
  });
  subscription.unsubscribe();
  t.notThrows(() => observer!.error(1));
});
test('throws when the subscription is cancelled', t => {
  let error = new Error();
  let observer: SubscriptionObserver<{}>;
  let subscription = new Observable(x => {
    observer = x;
  }).subscribe({
    error() {},
  });
  subscription.unsubscribe();
  t.throws(() => observer!.error(error), { is: error });
});

// TODO?: we have a sync implementation
test.skip('queues if the subscription is not initialized', async t => {
  let error;
  new Observable(x => {
    x.error(new Error());
  }).subscribe({
    error(err) {
      error = err;
    },
  });
  t.is(error, undefined);
  await null;
  t.true(error);
});

// TODO?: we have a sync implementation
test.skip('queues if the observer is running', async t => {
  let observer: SubscriptionObserver<{}>;
  let error;
  new Observable(x => {
    observer = x;
  }).subscribe({
    next() {
      observer.error(new Error());
    },
    error(e) {
      error = e;
    },
  });
  observer!.next();
  t.true(!error);
  await null;
  t.true(error);
});

test('closes the subscription before invoking inner observer', t => {
  let closed;
  let observer = getObserver({
    error() {
      closed = observer.closed;
    },
  });
  observer.error(1);
  t.is(closed, true);
});

test('reports an error if "error" is not a method', t => {
  // @ts-ignore
  let observer = getObserver({ error: 1 });
  t.throws(() => observer.error(1));
});

test('reports an error if "error" is undefined', t => {
  let error = new Error();
  let observer = getObserver({ error: undefined });
  t.throws(() => observer.error(error), { is: error } as ThrowsExpectation);
});

test('reports an error if "error" is null', t => {
  let error = new Error();
  // @ts-ignore
  let observer = getObserver({ error: null });
  t.throws(() => observer.error(error), { is: error } as ThrowsExpectation);
});

test('reports error if "error" throws', t => {
  let error = new Error();
  let observer = getObserver({
    error() {
      throw error;
    },
  });
  t.throws(() => observer.error(), { is: error } as ThrowsExpectation);
});

test('calls the cleanup method after "error"', t => {
  let calls: string[] = [];
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
    return () => {
      calls.push('cleanup');
    };
  }).subscribe({
    error() {
      calls.push('error');
    },
  });
  observer!.error();
  t.deepEqual(calls, ['error', 'cleanup']);
});

test('calls the cleanup method if there is no "error"', t => {
  let calls: string[] = [];
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
    return () => {
      calls.push('cleanup');
    };
  }).subscribe({});
  try {
    observer!.error();
  } catch (err) {}
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
  }).subscribe();
  t.throws(() => observer.error(1), { is: error } as ThrowsExpectation);
});
