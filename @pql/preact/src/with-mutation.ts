import { Component, ComponentFactory, h } from 'preact';
import { Client } from '@pql/client';
import { assign, EMPTY_OBJECT, overrideOp } from './util';
import { runMutation } from './common';
import { IOperation } from './index';

interface MutationState<T> {
  error?: any;
  data: T | null;
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
  // function init(component: Component<MutationProps<Vars>>, props: MutationProps<Vars>, client: Client) {
  //   let loading = false;
  //   let query = overrideOp(overrideOp(opts.mutation, props.mutation), {
  //     variables: props.variables,
  //   });
  //
  //   const rerender = () => component.setState(EMPTY_OBJECT);
  //
  //   const state: MutationState<T, Vars> = {
  //     data: null,
  //     query: overrideOp(overrideOp(opts.mutation, props.mutation), {
  //       variables: props.variables,
  //     }),
  //   };
  //
  //   function mutate({
  //                     mutation,
  //                     update,
  //                     variables,
  //                     optimisticResponse,
  //                   }: MutationArgs<T, Vars> = {}) {
  //     loading = true;
  //
  //     query = overrideOp(state.query, mutation);
  //     query.variables = variables || state.query.variables;
  //
  //
  //     state.data = optimisticResponse || state.data;
  //     rerender();
  //
  //     return runMutation<T, Vars>(client, assign({ update }, state.query)).then(
  //       res => {
  //         state.loading = false;
  //         assign(state, res);
  //         rerender();
  //         return res;
  //       }
  //     );
  //   }
  //
  //   component.componentDidMount = component.componentDidUpdate = (prev?: MutationProps<Vars>) => {
  //
  //   };
  //
  //   return () => assign({ mutate, loading }, state);
  // }
  //
  // function WithMutation(this: Component<any, any>, props: MutationProps<Vars>, { client }: { client: Client }) {
  //   // @ts-ignore
  //   const buildResult = this._b || (this._b = init(this, props, client));
  //   return h(Child, assign(props || {}, buildResult()));
  // }

  function WithMutation(
    this: Component<any, any>,
    props: MutationProps<Vars>,
    { client }: { client: Client }
  ) {
    let loading = false;
    let query = overrideOp(overrideOp(opts.mutation, props.mutation), {
      variables: props.variables,
    });

    const rerender = () => this.setState(EMPTY_OBJECT);

    const state: MutationState<T> = {
      data: null,
    };

    function mutate({
      mutation,
      update,
      variables,
      optimisticResponse,
    }: MutationArgs<T, Vars> = {}) {
      loading = true;

      assign(state, overrideOp(query, mutation));
      query.variables = variables || query.variables;
      state.data = optimisticResponse || state.data;
      rerender();

      return runMutation<T, Vars>(client, assign({ update }, query)).then(
        res => {
          loading = false;
          assign(state, res);
          rerender();
          return res;
        }
      );
    }

    function buildResult(): MutatedProps<T, Vars> {
      return assign(state, { mutate, loading });
    }
    this.render = props => h(Child, assign(props || {}, buildResult()));
  }

  WithMutation.prototype.__proto__ = Component.prototype;
  WithMutation.__proto__ = Component;

  return WithMutation as any;
}
