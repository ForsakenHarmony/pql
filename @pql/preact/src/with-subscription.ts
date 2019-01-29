import { Client } from '@pql/client';
import { Component, ComponentConstructor, ComponentFactory, h } from 'preact';
import {
  assign,
  EMPTY_OBJECT,
  hashOp,
  noop,
  dEql,
  overrideOp,
  Without,
} from './util';
import { runQuery, runSubscription } from './common';
import { IOperation } from './index';

interface ISubscriberProps<T> {
  data: T | null;
  error?: any;
  loaded: boolean;
  stopped: boolean;
  stop: Function;
}

interface ISubscribeOptions<T, OT, QVars, SVars> {
  query: IOperation<QVars>;
  subscription: IOperation<SVars>;
  processUpdate: (data: OT | null, next: T) => OT;
}

export interface ISubscribeState<T> {
  data: T | null;
  error?: any;
  loaded: boolean;
  stopped: boolean;
}

interface ISubscribeProps<QVars, SVars> {
  query?: IOperation<QVars>;
  subscription?: IOperation<SVars>;
}

export function withSubscription<
  T,
  QVars,
  SVars,
  SP extends ISubscribeProps<QVars, SVars>,
  OT = T
>(
  Child: ComponentFactory<SP>,
  opts: ISubscribeOptions<T, OT, QVars, SVars>
): ComponentFactory<
  ISubscriberProps<T> & Without<SP, ISubscribeProps<QVars, SVars>>
> {
  opts.processUpdate = opts.processUpdate || ((_, data) => data);

  function WithSubscription(
    this: Component<any, any>,
    props: SP,
    { client }: { client: Client }
  ) {
    let stop: Function = noop;
    const state: ISubscribeState<OT> = {
      data: null,
      loaded: false,
      stopped: false,
    };
    let query = overrideOp(opts.query, props.query);
    let subscription = overrideOp(opts.subscription, props.subscription);
    let unsub = noop;
    let hashes: string[] = [];

    const rerender = () => this.setState(EMPTY_OBJECT);

    function update(
      { data, error }: { data?: T | null; error?: any },
      stop_: Function
    ) {
      stop = stop_;
      let didChange = false;
      if (data) {
        const newData = opts.processUpdate(state.data, data);
        if (!dEql(newData, state.data)) didChange = true;
        state.data = newData;
      }
      if (!dEql(error, state.error)) didChange = true;
      state.error = error;
      didChange && rerender();
    }
    this.componentDidMount = () => {
      fetch();
      unsub = client.onInvalidate(hash => hashes.includes(hash) && fetch());
    };
    this.componentDidUpdate = prev =>
      ((!dEql(prev.query, this.props.query) &&
        assign(query, this.props.query)) ||
        !dEql(prev.subscription, this.props.subscription)) &&
      assign(subscription, this.props.subscription) &&
      fetch();
    this.componentWillUnmount = () => {
      stop();
      unsub();
    };

    const subscribe = () => {
      if (state.stopped) return;
      hashes.push(hashOp(subscription));
      stop();
      return runSubscription<any, SVars>(client, subscription, update);
    };

    const fetch = () => {
      // stop();
      hashes = [hashOp(query)];
      runQuery<T, QVars, OT>(
        client,
        assign(
          {
            data: null,
            updateQuery: opts.processUpdate,
          },
          query
        )
      )
        .then(res => {
          assign(state, res);
          state.loaded = true;
          rerender();
          if (!state.data) throw new Error(state.error);
        })
        .then(subscribe);
    };

    this.render = props =>
      h(
        Child,
        assign(props || {}, {
          data: state.data,
          loaded: state.loaded,
          stop: () => {
            state.stopped = true;
            stop();
          },
        })
      );
  }

  WithSubscription.prototype.__proto__ = Component.prototype;
  WithSubscription.prototype.isReactComponent = true;
  WithSubscription.__proto__ = Component;

  return (WithSubscription as unknown) as ComponentConstructor<any>;
}
