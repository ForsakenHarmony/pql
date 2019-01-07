import { Client, CtxFactory } from '@pql/client';
import { Component, ComponentConstructor, ComponentFactory, h } from 'preact';
import { assign, EMPTY_OBJECT, noop } from './util';
import { runQuery, runSubscription } from './common';

interface ISubscriberProps<T> {
  data: T | null;
  error?: any;
  loaded: boolean;
  stopped: boolean;
  stop: Function;
}

interface ISubscribeOptions<T, OT, QVars, SVars> {
  query: {
    op: CtxFactory<QVars>;
    variables: QVars;
  };
  subscription: {
    op: CtxFactory<SVars>;
    variables: SVars;
  };
  processUpdate: (data: OT | null, next: T) => OT;
}

export interface ISubscribeState<T> {
  data: T | null;
  error?: any;
  loaded: boolean;
  stopped: boolean;
}

export function withSubscription<
  T,
  SP extends ISubscriberProps<T>,
  QVars,
  SVars,
  OT = T
>(
  Child: ComponentFactory<SP>,
  opts: ISubscribeOptions<T, OT, QVars, SVars>
): ComponentFactory<SP> {
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

    function subscribe() {
      if (state.stopped) return;
      return runSubscription(
        client,
        {
          query: opts.subscription.op,
          variables: opts.subscription.variables,
        },
        update
      );
    }

    this.componentDidMount = () => {
      runQuery<T, QVars, OT>(client, {
        query: opts.query.op,
        variables: opts.query.variables,
        data: state.data,
        updateQuery: opts.processUpdate,
      })
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
