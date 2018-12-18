import test from 'ava';
import { testMethodProperty } from './properties';
import { IObservable, Observable, SubscriptionObserver } from '../src';

const iterable = {
  *[Symbol.iterator]() {
    yield 1;
    yield 2;
    yield 3;
  },
};

test('is a method on Observable', t => {
  testMethodProperty(t, Observable, 'from', {
    configurable: true,
    writable: true,
    length: 1,
  });
});

test('throws if the argument is null', t => {
  // @ts-ignore
  t.throws(() => Observable.from(null));
});

test('throws if the argument is undefined', t => {
  // @ts-ignore
  t.throws(() => Observable.from(undefined));
});

test('throws if the argument is not observable or iterable', t => {
  // @ts-ignore
  t.throws(() => Observable.from({}));
});

test('returns the input if the constructor matches "this"', t => {
  let ctor = function() {};
  let observable = new Observable(() => {});
  observable.constructor = ctor;
  t.is(Observable.from.call(ctor, observable), observable);
});

// we have a sync implementation
test.skip('wraps the input if it is not an instance of Observable', t => {
  let obj = {
    constructor: Observable,
    [Symbol.observable]() {
      return this;
    },
  };
  // @ts-ignore
  t.true(Observable.from(obj) !== obj);
});

test('throws if @@observable property is not a method', t => {
  // @ts-ignore
  t.throws(() =>
    Observable.from({
      [Symbol.observable]: 1,
    })
  );
});

test('returns an observable wrapping @@observable result', t => {
  let observer: SubscriptionObserver<{}>;
  let cleanupCalled = true;
  let inner = {
    subscribe(x: SubscriptionObserver<{}>) {
      observer = x;
      return () => {
        cleanupCalled = true;
      };
    },
  };
  let observable = Observable.from(({
    [Symbol.observable]() {
      return inner;
    },
  } as unknown) as IObservable<{}>);
  observable.subscribe();
  t.is(typeof observer!.next, 'function');
  observer!.complete();
  t.is(cleanupCalled, true);
});

test('throws if @@iterator is not a method', t => {
  // @ts-ignore
  t.throws(() => Observable.from({ [Symbol.iterator]: 1 }));
});

test('returns an observable wrapping iterables', async t => {
  let calls: (any)[] = [];
  Observable.from(iterable).subscribe({
    next(v) {
      calls.push(['next', v]);
    },
    complete() {
      calls.push(['complete']);
    },
  });
  t.deepEqual(calls, [['next', 1], ['next', 2], ['next', 3], ['complete']]);
});
