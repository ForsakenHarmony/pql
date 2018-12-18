import test from 'ava';
import { Observable } from '../src';
import { testMethodProperty } from './properties';

test('throws if called as a function', t => {
  // @ts-ignore
  t.throws(() => Observable(() => {}));
  t.throws(() => Observable.call({}, () => {}));
});

test('throws if the argument is not callable', t => {
  // @ts-ignore
  t.throws(() => new Observable({}));
  // @ts-ignore
  t.throws(() => new Observable());
  // @ts-ignore
  t.throws(() => new Observable(1));
  // @ts-ignore
  t.throws(() => new Observable('string'));
});

test('accepts a function argument', t => {
  let result = new Observable(() => {});
  t.true(result instanceof Observable);
});

test('is the value of Observable.prototype.constructor', t => {
  testMethodProperty(t, Observable.prototype, 'constructor', {
    configurable: true,
    writable: true,
    length: 1,
  });
});

test('does not call the subscriber function', t => {
  let called = 0;
  new Observable(() => {
    called++;
  });
  t.is(called, 0);
});
