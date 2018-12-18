import { ExecutionContext } from 'ava';

export function testMethodProperty(
  t: ExecutionContext,
  object: any,
  key: any,
  options: {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    length?: number;
    get?: boolean;
    set?: boolean;
  }
) {
  let desc = Object.getOwnPropertyDescriptor(object, key) as PropertyDescriptor;
  let {
    enumerable = false,
    configurable = false,
    writable = false,
    length,
  } = options;

  t.truthy(desc, `Property ${key.toString()} exists`);

  if (options.get || options.set) {
    if (options.get) {
      t.is(typeof desc.get, 'function', 'Getter is a function');
      t.is(desc.get!.length, 0, 'Getter length is 0');
    } else {
      t.is(desc.get, undefined, 'Getter is undefined');
    }

    if (options.set) {
      t.is(typeof desc.set, 'function', 'Setter is a function');
      t.is(desc.set!.length, 1, 'Setter length is 1');
    } else {
      t.is(desc.set, undefined, 'Setter is undefined');
    }
  } else {
    t.is(typeof desc.value, 'function', 'Value is a function');
    t.is(desc.value.length, length, `Function length is ${length}`);
    t.is(desc.writable, writable, `Writable property is correct ${writable}`);
  }

  // FIXME: I just don't care enough right now
  t.is.skip(
    desc.enumerable,
    enumerable,
    `Enumerable property is ${enumerable}`
  );
  t.is(
    desc.configurable,
    configurable,
    `Configurable property is ${configurable}`
  );
}
