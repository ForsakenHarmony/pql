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
  testMethodProperty(t, Object.getPrototypeOf(observer), 'next', {
    configurable: true,
    writable: true,
    length: 1,
  });
});

test('forwards the first argument', t => {
  let args;
  let observer = getObserver({
    next(...a) {
      args = a;
    },
  });
  // @ts-ignore
  observer.next(1, 2);
  t.deepEqual(args, [1]);
});

// FIXME?: this is the opposite of the spec tests?
test.skip('does not return a value', t => {
  let observer = getObserver({
    next() {
      return 1;
    },
  });
  t.is(observer.next(), undefined);
});
test('returns a value', t => {
  let observer = getObserver({
    next() {
      return 1;
    },
  });
  t.is(observer.next(), 1);
});

test('does not forward when the subscription is complete', t => {
  let count = 0;
  let observer = getObserver({
    next() {
      count++;
    },
  });
  observer.complete();
  observer.next();
  t.is(count, 0);
});

test('does not forward when the subscription is cancelled', t => {
  let count = 0;
  let observer: SubscriptionObserver<{}>;
  let subscription = new Observable(x => {
    observer = x;
  }).subscribe({
    next() {
      count++;
    },
  });
  subscription.unsubscribe();
  observer!.next();
  t.is(count, 0);
});

test('remains closed if the subscription is cancelled from "next"', t => {
  let observer: SubscriptionObserver<{}>;
  let subscription = new Observable(x => {
    observer = x;
  }).subscribe({
    next() {
      subscription.unsubscribe();
    },
  });
  observer!.next();
  t.is(observer!.closed, true);
});

// we have a sync implementation
test.skip('queues if the subscription is not initialized', async t => {
  let values: number[] = [];
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
    x.next(1);
  }).subscribe({
    next(val: number) {
      values.push(val);
      if (val === 1) {
        observer.next(3);
      }
    },
  });
  observer!.next(2);
  t.deepEqual(values, []);
  await null;
  t.deepEqual(values, [1, 2]);
  await null;
  t.deepEqual(values, [1, 2, 3]);
});

// we have a sync implementation
test.skip('drops queue if subscription is closed', async t => {
  let values: number[] = [];
  let subscription = new Observable(x => {
    x.next(1);
  }).subscribe({
    next(val: number) {
      values.push(val);
    },
  });
  t.deepEqual(values, []);
  subscription.unsubscribe();
  await null;
  t.deepEqual(values, []);
});

// we have a sync implementation
test.skip('queues if the observer is running', async t => {
  let observer: SubscriptionObserver<{}>;
  let values: number[] = [];
  new Observable(x => {
    observer = x;
  }).subscribe({
    next(val: number) {
      values.push(val);
      if (val === 1) observer.next(2);
    },
  });
  observer!.next(1);
  t.deepEqual(values, [1]);
  await null;
  t.deepEqual(values, [1, 2]);
});

test('reports error if "next" is not a method', t => {
  // @ts-ignore
  let observer = getObserver({ next: 1 });
  t.throws(() => observer.next());
});

test('does not report error if "next" is undefined', t => {
  let observer = getObserver({ next: undefined });
  t.notThrows(() => observer.next());
});

test('does not report error if "next" is null', t => {
  // @ts-ignore
  let observer = getObserver({ next: null });
  t.notThrows(() => observer.next());
});

// this is the opposite of the spec tests?
test.skip('reports error if "next" throws', t => {
  let error = new Error();
  let observer = getObserver({
    next() {
      throw error;
    },
  });
  t.throws(() => observer.next(), { is: error } as ThrowsExpectation);
});

// this is the opposite of the spec tests?
test.skip('does not close the subscription on error', t => {
  let observer = getObserver({
    next() {
      throw {};
    },
  });
  observer.next();
  t.is(observer.closed, false);
});
