import test from 'ava';
import { testMethodProperty } from './properties';
import { Observable, SubscriptionObserver } from '../src';

test('is a method of Observable.prototype', t => {
  testMethodProperty(t, Observable.prototype, 'subscribe', {
    configurable: true,
    writable: true,
    length: 1,
  });
});

test('accepts an observer argument', t => {
  let observer: SubscriptionObserver<{}>;
  let nextValue;
  new Observable(x => {
    observer = x;
  }).subscribe({
    next(v) {
      nextValue = v;
    },
  });
  observer!.next(1);
  t.is(nextValue, 1);
});

test('accepts a next function argument', t => {
  let observer: SubscriptionObserver<{}>;
  let nextValue;
  new Observable(x => {
    observer = x;
  }).subscribe(v => (nextValue = v));
  observer!.next(1);
  t.is(nextValue, 1);
});

test('accepts an error function argument', t => {
  let observer: SubscriptionObserver<{}>;
  let errorValue;
  let error = new Error();
  new Observable(x => {
    observer = x;
  }).subscribe(undefined, e => (errorValue = e));
  observer!.error(error);
  t.is(errorValue, error);
});

test('accepts a complete function argument', t => {
  let observer: SubscriptionObserver<{}>;
  let completed = false;
  new Observable(x => {
    observer = x;
  }).subscribe(undefined, undefined, () => (completed = true));
  observer!.complete();
  t.is(completed, true);
});

test('uses function overload if first argument is null', t => {
  let observer: SubscriptionObserver<{}>;
  let completed = false;
  new Observable(x => {
    observer = x;
  }).subscribe(undefined, undefined, () => (completed = true));
  observer!.complete();
  t.is(completed, true);
});

test('uses function overload if first argument is undefined', t => {
  let observer: SubscriptionObserver<{}>;
  let completed = false;
  new Observable(x => {
    observer = x;
  }).subscribe(undefined, undefined, () => (completed = true));
  observer!.complete();
  t.is(completed, true);
});

test('uses function overload if first argument is a primative', t => {
  let observer: SubscriptionObserver<{}>;
  let completed = false;
  new Observable(x => {
    observer = x;
  }).subscribe(
    //@ts-ignore
    'abc',
    null,
    () => (completed = true)
  );
  observer!.complete();
  t.is(completed, true);
});

// TODO?: we have a sync implementation
test.skip('enqueues a job to send error if subscriber throws', async t => {
  let error = {};
  let errorValue = undefined;
  new Observable(() => {
    throw error;
  }).subscribe({
    error(e) {
      errorValue = e;
    },
  });
  t.is(errorValue, undefined);
  await null;
  t.is(errorValue, error);
});

// TODO?: we have a sync implementation
test.skip('does not send error if unsubscribed', async t => {
  let error = {};
  let errorValue = undefined;
  let subscription = new Observable(() => {
    throw error;
  }).subscribe({
    error(e) {
      errorValue = e;
    },
  });
  subscription.unsubscribe();
  t.is(errorValue, undefined);
  await null;
  t.is(errorValue, undefined);
});

test('accepts a cleanup function from the subscriber function', t => {
  let cleanupCalled = false;
  let subscription = new Observable(() => {
    return () => (cleanupCalled = true);
  }).subscribe();
  subscription.unsubscribe();
  t.is(cleanupCalled, true);
});

test('accepts a subscription object from the subscriber function', t => {
  let cleanupCalled = false;
  let subscription = new Observable(() => {
    return {
      unsubscribe() {
        cleanupCalled = true;
      },
      get closed() {
        return cleanupCalled;
      },
    };
  }).subscribe();
  subscription.unsubscribe();
  t.is(cleanupCalled, true);
});
