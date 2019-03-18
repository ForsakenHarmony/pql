type voidRet = () => void;

if (!Symbol.observable)
  Object.defineProperty(Symbol, 'observable', { value: Symbol('observable') });

function getMethod(obj: any, key: string) {
  if (!obj.hasOwnProperty(key)) return;
  let value = undefined;
  try {
    value = obj[key];
  } catch (e) {
    return;
  }
  if (value && typeof value !== 'function')
    throw new TypeError(value + ' is not a function');
  return value;
}

function hasMethod(obj: any, key: any) {
  return typeof obj[key] === 'function';
}

export interface IObservable<T> {
  [Symbol.observable](): Observable<T>;
}

export class Observable<T> implements IObservable<T> {
  constructor(private readonly subscriber: SubscriberFunction<T>) {
    if (this.constructor !== Observable)
      throw new TypeError("Can't call Observable as a function");
    if (typeof subscriber !== 'function')
      throw new TypeError(subscriber + ' is not callable');
  }

  // Subscribes to the sequence with an observer
  subscribe(observer?: Observer<T>): ISubscription;
  // Subscribes to the sequence with callbacks
  subscribe(
    onNext?: (value: T) => void,
    onError?: (errorValue: Error) => void,
    onComplete?: voidRet
  ): ISubscription;
  subscribe(observerOrCb?: Observer<T> | ((value: T) => void)): ISubscription {
    if (
      typeof observerOrCb !== 'object' &&
      !Array.from(arguments).filter(arg => typeof arg === 'function').length &&
      observerOrCb
    )
      throw new TypeError(observerOrCb + ' is not an object');
    const observer: Observer<T> =
      typeof observerOrCb === 'object'
        ? observerOrCb
        : {
            next: observerOrCb,
            error: arguments[1],
            complete: arguments[2],
          };

    return new Subscription<T>(observer, this.subscriber);
  }

  // Returns itself
  [Symbol.observable](): Observable<T> {
    return this;
  }

  // Converts items to an Observable
  static of<T>(...items: T[]): Observable<T> {
    return Observable.fromIterator.call(this, items) as Observable<T>;
  }

  private static fromIterator<T>(iter: Iterable<T>): Observable<T> {
    const C = typeof this === 'function' ? this : Observable;
    return new C<T>(observer => {
      for (let item of iter) {
        observer.next(item);
        if (observer.closed) return;
      }
      observer.complete();
    });
  }

  // Converts an observable or iterable to an Observable
  static from<T>(observable: IObservable<T> | Iterable<T>): Observable<T> {
    const C = typeof this === 'function' ? this : Observable;
    if (observable == null)
      throw new TypeError(observable + ' is not an object');
    if (hasMethod(observable, Symbol.observable)) {
      const obs = (observable as any)[Symbol.observable]();
      if (!obs) throw new TypeError(obs + ' is not observable');
      return obs.constructor === C
        ? (obs as Observable<T>)
        : new C(observer => (obs as Observable<T>).subscribe(observer));
    } else if (hasMethod(observable, Symbol.iterator)) {
      return Observable.fromIterator.call(C, observable as Iterable<
        T
      >) as Observable<T>;
    } else {
      throw new TypeError(observable + ' is not observable');
    }
  }

  map<NT = T>(mapFn: (item: T) => NT): Observable<NT> {
    if (typeof mapFn !== 'function')
      throw new TypeError(mapFn + ' is not a function');
    return new Observable<NT>(observer =>
      this.subscribe(
        Object.assign({}, observer, {
          next: (item: T) => observer.next(mapFn(item)),
        })
      )
    );
  }

  forEach(fn: (item: T, cancel: voidRet) => void): Promise<undefined> {
    return new Promise((res, rej) => {
      if (typeof fn !== 'function')
        return rej(new TypeError(fn + ' is not a function'));
      let unsubbed = false;
      let unsub = () => {
        unsubbed = true;
      };
      const sub = this.subscribe({
        next(value: T): void {
          try {
            !unsubbed && fn(value, unsub);
          } catch (e) {
            rej(e);
            unsub();
          }
        },
        complete: res,
        error: rej,
      });
      unsub = () => {
        unsubbed = true;
        sub.unsubscribe();
        res();
      };
      unsubbed && unsub();
    });
  }

  concat(merge: Observable<T>): Observable<T> {
    return new Observable<T>(observer => {
      this.subscribe(
        Object.assign({}, observer, {
          complete: () => {
            merge.subscribe(observer);
          },
        })
      );
    });
  }

  filter(filterFn: (item: T) => boolean): Observable<T> {
    if (typeof filterFn !== 'function')
      throw new TypeError(filterFn + ' is not a function');
    return new Observable<T>(observer =>
      this.subscribe(
        Object.assign({}, observer, {
          next: (item: T) => filterFn(item) && observer.next(item),
        })
      )
    );
  }

  // @ts-ignore
  reduce<NT = T>(
    reduce_fn: (acc: NT, val: T) => NT,
    seed?: NT
  ): Observable<NT> {
    if (typeof reduce_fn !== 'function')
      throw new TypeError(reduce_fn + ' is not a function');
    return new Observable<NT>(observer => {
      let last: NT | undefined = seed;
      this.subscribe(
        Object.assign({}, observer, {
          next(item: T) {
            if (!last) last = (item as unknown) as NT;
            else last = reduce_fn(last, item);
          },
          complete(): any {
            if (!last) {
              observer.error(new Error("Can't reduce empty Observable"));
            }
            observer.next(last);
            observer.complete();
          },
        })
      );
    });
  }

  toPromise(): Promise<T> {
    return new Promise<T>((res, rej) => {
      this.forEach((item, unsub) => {
        res(item);
        unsub();
      }).then(rej, rej);
    });
  }
}

export interface ISubscription {
  // Cancels the subscription
  unsubscribe(): void;

  // A boolean value indicating whether the subscription is closed
  closed: boolean;
}

export class Subscription<T> implements ISubscription {
  private readonly cleanup?: voidRet;
  private completed = false;
  private cleaned = false;

  constructor(
    readonly observer: Observer<T>,
    subscriber: SubscriberFunction<T>
  ) {
    if (typeof observer.start === 'function') {
      observer.start(this);
    }
    if (this.completed) return;

    const subscriptionObserver = new SubscriptionObserver(this);
    try {
      let cleanup = subscriber(subscriptionObserver);
      if (cleanup != null) {
        if (typeof (cleanup as any).unsubscribe === 'function') {
          cleanup = (cleanup as any).unsubscribe.bind(cleanup);
        }
        if (typeof cleanup !== 'function')
          throw new TypeError(cleanup + ' is not a function');
        this.cleanup = cleanup;
        this.cleaned = false;
      }
    } catch (e) {
      subscriptionObserver.error(e);
      return;
    }

    if (this.completed) this.unsubscribe();
  }

  complete() {
    this.completed = true;
  }

  // Cancels the subscription
  unsubscribe(): boolean {
    if (this.cleaned) return true;
    this.completed = true;
    this.cleaned = true;
    if (typeof this.cleanup === 'function') {
      this.cleanup();
      return true;
    }
    return false;
  }

  // A boolean value indicating whether the subscription is closed
  get closed() {
    return this.completed;
  }
}

// Promises don't get handled in any way, but I wanted to accept it as a type
export type SubscriberFunction<T> = (
  observer: SubscriptionObserver<T>
) => voidRet | ISubscription | Promise<any> | void;

export interface Observer<T> {
  // Receives the subscription object when `subscribe` is called
  start?(subscription: ISubscription): void;

  // Receives the next value in the sequence
  next?(value: T): void;

  // Receives the sequence error
  error?(errorValue: any): void;

  // Receives a completion notification
  complete?(arg?: any): any;
}

export class SubscriptionObserver<T> {
  constructor(private readonly subscription: Subscription<T>) {
    this.next = this.next.bind(this);
    this.error = this.error.bind(this);
    this.complete = this.complete.bind(this);
  }

  private notify(type: 'next' | 'error' | 'complete', arg: any) {
    if (this.closed)
      if (type === 'error') throw arg;
      else return;
    if (type === 'error' || type === 'complete') this.subscription.complete();
    const method = getMethod(this.subscription.observer, type);
    let error = undefined;
    let value = undefined;
    if (method)
      try {
        value = method(arg);
      } catch (e) {
        error = e;
      }

    if (type === 'error' || type === 'complete' || (type === 'next' && error))
      try {
        if (!this.subscription.unsubscribe() && error) throw error;
      } catch (cleanupError) {
        if (error) throw error;
        else throw cleanupError;
      }

    if (!method && type === 'error') throw arg;

    return value;
  }

  // Sends the next value in the sequence
  next(value?: T) {
    return this.notify('next', value);
  }

  // Sends the sequence error
  error(errorValue?: any) {
    return this.notify('error', errorValue);
  }

  // Sends the completion notification
  complete(arg?: any): any;
  complete() {
    return this.notify('complete', arguments[0]);
  }

  // A boolean value indicating whether the subscription is closed
  get closed(): boolean {
    return this.subscription.closed;
  }
}
