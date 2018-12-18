import test from 'ava';
import { Observable } from '../src';

test('maps the results using the supplied callback', async t => {
  let list: number[] = [];

  debugger;
  await Observable.from([1, 2, 3])
    .map(x => x * 2)
    .forEach(x => list.push(x));

  t.deepEqual(list, [2, 4, 6]);
});
