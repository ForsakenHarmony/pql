import { Component, ComponentConstructor, ComponentFactory, h } from 'preact';
import { Client } from '@pql/client';
import { assign, EMPTY_OBJECT, overrideOp } from './util';
import { runMutation } from './common';
import { IOperation } from './index';

interface MutationState<T, Vars> {
  loading: boolean;
  error?: any;
  data: T | null;
  query: IOperation<Vars>;
}

export interface MutationArgs<T, Vars> {
  mutation?: IOperation<Vars>;
  variables?: Vars;
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
      query: overrideOp(overrideOp(opts.mutation, props.mutation), {
        variables: props.variables,
      }),
    };
    const rerender = () =>
      Component.prototype.setState.call<Component<any, any>, [{}], void>(
        this,
        EMPTY_OBJECT
      );

    function mutate({
      mutation,
      update,
      variables,
      optimisticResponse,
    }: MutationArgs<T, Vars> = {}) {
      state.loading = true;

      assign(state, overrideOp(state.query, mutation));
      state.query.variables = variables || state.query.variables;
      state.data = optimisticResponse || state.data;
      rerender();

      return runMutation<T, Vars>(client, assign({ update }, state.query)).then(
        res => {
          state.loading = false;
          assign(state, res);
          rerender();
          return res;
        }
      );
    }

    function buildResult(): MutatedProps<T, Vars> {
      return assign(state, { mutate });
    }
    this.render = props => h(Child, assign(props || {}, buildResult()));
  }

  return (WithMutation as unknown) as ComponentConstructor<any>;
}
