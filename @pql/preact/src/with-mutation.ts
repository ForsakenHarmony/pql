import { Component, ComponentConstructor, ComponentFactory, h } from 'preact';
import { Client, CtxFactory } from '@pql/client';
import { assign, EMPTY_OBJECT } from './util';
import { runMutation } from './common';
import { IOperation } from './index';

interface MutationState<T, Vars> {
  loading: boolean;
  error?: any;
  data: T | null;
  mutation: CtxFactory<Vars>;
  variables?: Vars;
}

export interface MutationArgs<T, Vars> {
  mutation?: IOperation<Vars>;
  variables?: Vars,
  optimisticResponse?: T;
  update?: (data: T) => T;
}

export interface MutateFn<T, Vars> {
  (args: MutationArgs<T, Vars>): Promise<{
    data: T | null;
    error?: any;
  }>;
}

export interface MutatedProps<T, Vars> {
  loading: boolean;
  error?: any;
  data: T | null;
  variables?: Vars;
  ['mutate']: MutateFn<T, Vars>;
}

export interface MutationOpts<Vars> {
  mutation: IOperation<Vars>;
}

export interface MutationProps<Vars> {
  mutation?: IOperation<Vars>;
  variables?: Vars;
}

export function withMutation<T, P extends MutatedProps<T, Vars>, Vars = {}>(
  Child: ComponentFactory<P>,
  opts: MutationOpts<Vars>
): ComponentFactory<MutationProps<Vars> & P> {
  function WithMutation(
    this: Component<any, any>,
    props: MutationProps<Vars>,
    { client }: { client: Client }
  ) {
    const state: MutationState<T, Vars> = {
      loading: false,
      data: null,
      mutation: (props.mutation && props.mutation.query) || opts.mutation.query,
      variables:
        props.variables ||
        (props.mutation && props.mutation!.variables) ||
        opts.mutation.variables,
    };
    const rerender = () => this.setState(EMPTY_OBJECT);
    function mutate({
      mutation,
      update,
      variables,
      optimisticResponse,
    }: MutationArgs<T, Vars> = {}) {
      state.loading = true;
      state.mutation = mutation && mutation.query || state.mutation;
      state.variables = variables || mutation && mutation.variables || state.variables;
      state.data = optimisticResponse || state.data;
      rerender();

      return runMutation<T, Vars>(client, {
        query: state.mutation,
        variables: state.variables,
        update,
      }).then(res => {
        state.loading = false;
        assign(state, res);
        rerender();
        return res;
      });
    }

    function buildResult(): MutatedProps<T, Vars> {
      return assign(state, { mutate });
    }
    this.render = props => h(Child, assign(props || {}, buildResult()));
  }

  WithMutation.prototype.__proto__ = Component.prototype;
  WithMutation.__proto__ = Component;

  return (WithMutation as unknown) as ComponentConstructor<any>;
}
