import test from 'ava';
import { Observable } from '../src';

test('concatenates the supplied Observable arguments', async t => {
  let list: number[] = [];

  await Observable.from([1, 2, 3, 4])
    .concat(Observable.of(5, 6, 7))
    .forEach(x => list.push(x));

  t.deepEqual(list, [1, 2, 3, 4, 5, 6, 7]);
});

test('can be used multiple times to produce the same results', async t => {
  const list1: number[] = [];
  const list2: number[] = [];

  const concatenated = Observable.from([1, 2, 3, 4]).concat(
    Observable.of(5, 6, 7)
  );

  await concatenated.forEach(x => list1.push(x));
  await concatenated.forEach(x => list2.push(x));

  t.deepEqual(list1, [1, 2, 3, 4, 5, 6, 7]);
  t.deepEqual(list2, [1, 2, 3, 4, 5, 6, 7]);
});
