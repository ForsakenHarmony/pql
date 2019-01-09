import { Client } from '@pql/client';
import { Component, ComponentConstructor, ComponentFactory, h } from 'preact';
import { assign, EMPTY_OBJECT, noop, overrideOp, Without } from './util';
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
    _props: SP,
    { client }: { client: Client }
  ) {
    let stop: Function = noop;
    const state: ISubscribeState<OT> = {
      data: null,
      loaded: false,
      stopped: false,
    };

    const rerender = () => this.setState(EMPTY_OBJECT);

    function update({ data, error }: { data?: T | null; error?: any }) {
      data && (state.data = opts.processUpdate(state.data, data));
      error && (state.error = error);
      rerender();
    }

    const subscribe = () => {
      if (state.stopped) return;
      return runSubscription<any, SVars>(
        client,
        overrideOp(opts.subscription, this.props.subscription),
        update
      );
    };

    const fetch = () => {
      stop();
      runQuery<T, QVars, OT>(
        client,
        assign(
          {
            data: state.data,
            updateQuery: opts.processUpdate,
          },
          overrideOp(opts.query, this.props.query)
        )
      )
        .then(res => {
          assign(state, res);
          state.loaded = true;
          rerender();
        })
        .then(subscribe);
    };

    this.componentDidMount = fetch;
    this.componentDidUpdate = prev =>
      (prev.query != this.props.query ||
        prev.subscription != this.props.subscription) &&
      fetch();

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
