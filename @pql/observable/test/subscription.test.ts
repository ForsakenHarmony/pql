import test, { ThrowsExpectation } from 'ava';
import { testMethodProperty } from './properties';
import { Observable } from '../src';

function getSubscription(subscriber = () => {}) {
  return new Observable(subscriber).subscribe({});
}

test('unsubscribe is a method on Subscription.prototype', t => {
  let subscription = getSubscription();
  testMethodProperty(t, Object.getPrototypeOf(subscription), 'unsubscribe', {
    configurable: true,
    writable: true,
    length: 0,
  });
});

test('unsubscribe reports an error if the cleanup function throws', t => {
  let error = new Error();
  let subscription = getSubscription(() => {
    return () => {
      throw error;
    };
  });
  t.throws(() => subscription.unsubscribe(), {
    is: error,
  } as ThrowsExpectation);
});

test('closed is a getter on Subscription.prototype', t => {
  let subscription = getSubscription();
  testMethodProperty(t, Object.getPrototypeOf(subscription), 'closed', {
    configurable: true,
    writable: true,
    get: true,
  });
});
