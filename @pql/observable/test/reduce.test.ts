import test from 'ava';
import { Observable } from '../src';

test('reduces without a seed', async t => {
  await Observable.from([1, 2, 3, 4, 5, 6])
    .reduce((a, b) => {
      return a + b;
    })
    .forEach(x => {
      t.is(x, 21);
    });
});

test('errors if empty and no seed', async t => {
  await t.throwsAsync(async () => {
    await Observable.from([])
      .reduce<number>((a, b) => {
        return a + b;
      })
      .forEach(() => null);
  });
});

test('reduces with a seed', async t => {
  await Observable.from([1, 2, 3, 4, 5, 6])
    .reduce((a, b) => {
      return a + b;
    }, 100)
    .forEach(x => {
      t.is(x, 121);
    });
});

test('reduces an empty list with a seed', async t => {
  await Observable.from([])
    .reduce((a, b) => {
      return a + b;
    }, 100)
    .forEach(x => {
      t.is(x, 100);
    });
});
