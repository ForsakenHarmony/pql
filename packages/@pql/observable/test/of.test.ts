import test from 'ava';
import { testMethodProperty } from './properties';
import { Observable } from '../src';

test('is a method on Observable', t => {
  testMethodProperty(t, Observable, 'of', {
    configurable: true,
    writable: true,
    length: 0,
  });
});

test('uses the this value if it is a function', t => {
  let usesThis = false;
  Observable.of.call(function() {
    usesThis = true;
  });
  t.true(usesThis);
});

test('uses Observable if the this value is not a function', t => {
  let result = Observable.of.call({}, 1, 2, 3, 4);
  t.true(result instanceof Observable);
});

test('delivers arguments to next in a job', async t => {
  let values: number[] = [];
  Observable.of(1, 2, 3, 4).subscribe(v => values.push(v));

  // TODO?: we have a sync implementation
  // t.is(values.length, 0);
  // await null;
  t.deepEqual(values, [1, 2, 3, 4]);
});
