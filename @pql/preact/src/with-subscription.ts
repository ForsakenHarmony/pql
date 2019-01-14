import { Client } from '@pql/client';
import { Component, ComponentConstructor, ComponentFactory, h } from 'preact';
import {
  assign,
  EMPTY_OBJECT,
  hashOp,
  noop,
  opsEqual,
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
    let subscription = overrideOp(opts.query, props.subscription);
    let unsub = noop;
    let hashes: string[] = [];

    const rerender = () => this.setState(EMPTY_OBJECT);

    function update(
      { data, error }: { data?: T | null; error?: any },
      stop_: Function
    ) {
      stop = stop_;
      data && (state.data = opts.processUpdate(state.data, data));
      error && (state.error = error);
      rerender();
    }
    this.componentDidMount = () => {
      fetch();
      unsub = client.onInvalidate(hash => hashes.includes(hash) && fetch());
    };
    this.componentDidUpdate = () =>
      ((!opsEqual(query, this.props.query) &&
        assign(query, this.props.query)) ||
        !opsEqual(subscription, this.props.subscription)) &&
      assign(subscription, this.props.subscription) &&
      fetch();
    this.componentWillUnmount = () => unsub();

    const subscribe = () => {
      if (state.stopped) return;
      hashes.push(hashOp(subscription));
      return runSubscription<any, SVars>(client, subscription, update);
    };

    const fetch = () => {
      stop();
      hashes = [hashOp(query)];
      runQuery<T, QVars, OT>(
        client,
        assign(
          {
            data: state.data,
            updateQuery: opts.processUpdate,
          },
          query
        )
      )
        .then(res => {
          assign(state, res);
          state.loaded = true;
          rerender();
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
  WithSubscription.__proto__ = Component;

  return (WithSubscription as unknown) as ComponentConstructor<any>;
}
