import { Client, CtxFactory } from '@pql/client';
import { Component, ComponentConstructor, ComponentFactory, h } from 'preact';
import { assign, EMPTY_OBJECT } from './util';
import { MutationArgs } from './with-mutation';
import { IOperation } from './index';
import { runMutation, runQuery } from './common';

type SetMapType<K, T> = { [P in keyof K]: T };

export interface ConnectProps {}

export interface ConnectOpts<QVars> {
  query?: IOperation<QVars>;
  mutation?: {
    [key: string]: IOperation<any>;
  };
  refetch: boolean;
}

export interface ConnectMutate<T, Vars = {}> {
  (args: MutationArgs<T, Vars>): Promise<{ data: T | null, error?: any }>
}

export type ConnnectedProps<T, Vars, O extends ConnectOpts<Vars>> = {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
  variables?: Vars;
} & SetMapType<O['mutation'], ConnectMutate<any>>;

interface ConnectState<T, Vars> {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
  query?: CtxFactory<Vars>;
  variables?: Vars;
}

type Without<T, K> = Pick<T, Exclude<keyof T, K>>;

export function connect<
  T,
  QVars = {},
  O extends ConnectOpts<QVars> = ConnectOpts<QVars>,
  P extends ConnnectedProps<T, QVars, O> = ConnnectedProps<T, QVars, O>
>(Child: ComponentFactory<P>, opts: O): ComponentFactory<ConnectProps & Without<P, ConnnectedProps<T, QVars, O>>> {
  function PqlConnect(
    this: Component<any, any>,
    _props: ConnectProps & P,
    { client }: { client: Client }
  ) {
    const state: ConnectState<T, QVars> = {
      loaded: !opts.query,
      loading: !!opts.query,
      data: null,
      query: opts.query && opts.query.query,
      variables: opts.query && opts.query.variables,
    };
    const rerender = () => this.setState(EMPTY_OBJECT);

    const fetch = () => {
      state.query &&
      runQuery<T, QVars>(client, {
        query: state.query,
        variables: state.variables,
        data: state.data,
      }).then(res => {
        state.loading = false;
        state.loaded = true;
        assign(state, res);
        rerender();
      });
    };

    this.componentDidMount = fetch;

    const mutate = <T, Vars>(op: IOperation<Vars>, {
      mutation: oOp,
      variables,
      update,
    }: MutationArgs<T, Vars> = {}) => {
      state.loading = true;
      rerender();
      const mutation =  oOp || op;

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

    function buildResult(): ConnnectedProps<T, QVars, O> {
      const mutations: {
        [key: string]: IOperation<any>;
      } = opts.mutation || {};
      return assign(state, Object.keys(mutations).reduce((acc, val) => {
        // @ts-ignore
        acc[val] = mutate.bind(null, mutations[val]);
        return acc;
      }, {})) as ConnnectedProps<T, QVars, O>;
    }

    this.render = props => h(Child, assign(props, buildResult()));
  }

  PqlConnect.prototype.__proto__ = Component.prototype;
  PqlConnect.__proto__ = Component;

  return (PqlConnect as unknown) as ComponentConstructor<any>;
}
