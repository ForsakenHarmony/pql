import test from 'ava';
import { testMethodProperty } from './properties';
import { Observable, SubscriptionObserver } from '../src';

test('is a getter on SubscriptionObserver.prototype', t => {
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
  }).subscribe({});
  testMethodProperty(t, Object.getPrototypeOf(observer!), 'closed', {
    get: true,
    configurable: true,
    writable: true,
    length: 1,
  });
});

test('returns false when the subscription is open', t => {
  new Observable(observer => {
    t.is(observer.closed, false);
  }).subscribe({});
});

test('returns true when the subscription is completed', t => {
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
  }).subscribe({});
  observer!.complete();
  t.is(observer!.closed, true);
});

test('returns true when the subscription is errored', t => {
  let observer: SubscriptionObserver<{}>;
  new Observable(x => {
    observer = x;
  }).subscribe(() => {}, () => {});
  observer!.error();
  t.is(observer!.closed, true);
});
