import test from 'ava';
import { Observable } from '../src';

test('filters the results using the supplied callback', async t => {
  let list: number[] = [];

  await Observable.from([1, 2, 3, 4])
    .filter(x => x > 2)
    .forEach(x => list.push(x));

  t.deepEqual(list, [3, 4]);
});
