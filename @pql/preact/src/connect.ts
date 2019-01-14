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
import { MutationArgs } from './with-mutation';
import { IOperation } from './index';
import { runMutation, runQuery } from './common';

type SetMapType<K, T> = { [P in keyof K]: T };

export interface ConnectProps<Vars> {
  variables?: Vars;
}

export interface MutationMap {
  [key: string]: IOperation<any>;
}

export interface ConnectOpts<QVars, Mut extends MutationMap = {}> {
  query?: IOperation<QVars>;
  mutation?: Mut;
  refetch?: boolean;
}

export interface ConnectMutate<T, Vars = {}> {
  (args: MutationArgs<T, Vars>): Promise<{ data: T | null; error?: any }>;
}

export declare type ConnnectedProps<
  T,
  Vars = {},
  Mut extends MutationMap = {},
  O extends ConnectOpts<Vars, Mut> = ConnectOpts<Vars, Mut>
> = {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
  variables?: Vars;
} & SetMapType<Mut, ConnectMutate<any>>;

interface ConnectState<T, Vars> {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
  query?: IOperation<Vars>;
}

export function connect<
  T,
  QVars = {},
  Mut extends MutationMap = {},
  O extends ConnectOpts<QVars, Mut> = ConnectOpts<QVars, Mut>,
  P extends ConnnectedProps<T, QVars, Mut, O> = ConnnectedProps<
    T,
    QVars,
    Mut,
    O
  >
>(
  Child: ComponentFactory<P>,
  opts: O
): ComponentFactory<
  ConnectProps<QVars> & Without<P, ConnnectedProps<T, QVars, Mut, O>>
> {
  function PqlConnect(
    this: Component<any, any>,
    props: ConnectProps<QVars> & P,
    { client }: { client: Client }
  ) {
    const state: ConnectState<T, QVars> = {
      loaded: !opts.query,
      loading: !!opts.query,
      data: null,
      query:
        opts.query && overrideOp(opts.query, { variables: props.variables }),
    };

    let unsub = noop;
    let hash = '';

    const rerender = () => this.setState(EMPTY_OBJECT);
    this.componentDidMount = () => {
      unsub = client.onInvalidate(h => h === hash && fetch());
      fetch();
    };
    this.componentDidUpdate = () =>
      !opsEqual(state.query, this.props.query) && fetch();
    this.componentWillUnmount = () => unsub();

    const fetch = () => {
      if (!state.query) return;
      state.loading = true;
      hash = hashOp(state.query);
      rerender();
      runQuery<T, QVars>(
        client,
        assign({ data: state.data }, state.query)
      ).then(res => {
        state.loading = false;
        state.loaded = true;
        assign(state, res);
        rerender();
      });
    };

    const mutate = <T, Vars>(
      op: IOperation<Vars>,
      { mutation: oOp, variables, update }: MutationArgs<T, Vars> = {}
    ) => {
      state.loading = true;
      rerender();
      const mutation = oOp || op;

      return runMutation<T, Vars>(client, {
        query: mutation.query,
        variables: variables || mutation.variables,
        update,
      }).then(res => {
        state.loading = false;
        rerender();
        if (opts.refetch) {
          fetch();
        }
        return res;
      });
    };

    function buildResult(): ConnnectedProps<T, QVars, Mut, O> {
      const mutations: {
        [key: string]: IOperation<any>;
      } = opts.mutation || {};
      return assign(
        state,
        Object.keys(mutations).reduce((acc, val) => {
          // @ts-ignore
          acc[val] = mutate.bind(null, mutations[val]);
          return acc;
        }, {})
      ) as ConnnectedProps<T, QVars, Mut, O>;
    }

    this.render = props => h(Child, assign(props, buildResult()));
  }

  PqlConnect.prototype.__proto__ = Component.prototype;
  PqlConnect.__proto__ = Component;

  return (PqlConnect as unknown) as ComponentConstructor<any>;
}
