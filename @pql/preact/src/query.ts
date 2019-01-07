import { Client, CtxFactory } from '@pql/client';
import { Component, ComponentChild, ComponentConstructor, RenderableProps } from 'preact';
import { assign, EMPTY_OBJECT } from './util';
import { runQuery } from './common';
import { IOperation } from './index';

interface QueryState<T, Vars> {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
  query: CtxFactory<Vars>;
  variables?: Vars;
}

interface FetchMoreOpts<T, Vars> {
  query?: IOperation<Vars>;
  updateQuery?: (prev: T | null, next: T) => T;
}

interface QueryResult<T, Vars> {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
  variables?: Vars;
  fetchMore: (opts: FetchMoreOpts<T, Vars>) => any;
}

interface QueryProps<T, Vars> {
  children: (opts: QueryResult<T, Vars>) => ComponentChild;
  skip?: boolean;
  query: IOperation<Vars>;
}

export const Query: ComponentConstructor<QueryProps<any, any>> = function Query<
  T,
  Vars = {},
  Props extends QueryProps<T, Vars> = QueryProps<T, Vars>
>(
  this: Component<Props>,
  props: RenderableProps<Props>,
  { client }: { client: Client }
): Component<Props> {
  const state: QueryState<T, Vars> = {
    loaded: !!props.skip,
    loading: !props.skip,
    error: null,
    data: null,
    query: props.query.query,
    variables: props.query.variables,
  };

  const rerender = () => this.setState(EMPTY_OBJECT);
  this.componentDidMount = () => fetch();
  this.componentWillReceiveProps = (next: Readonly<Props>) =>
    next.query !== this.props.query && fetch(next);

  function fetch({ query, updateQuery }: FetchMoreOpts<T, Vars> = {}) {
    state.loading = true;
    state.query = (query && query.query) || state.query;
    state.variables = (query && query.variables) || state.variables;
    rerender();

    return runQuery<T, Vars>(client, {
      query: state.query,
      variables: state.variables,
      data: state.data,
      updateQuery,
    }).then(res => {
      state.loading = false;
      state.loaded = true;
      assign(state, res);
      rerender();
      return res;
    });
  }

  function buildResult(): QueryResult<T, Vars> {
    return assign(state, {
      fetchMore: fetch,
    });
  }

  //@ts-ignore
  this.render = props => (props.children[0](buildResult())) || null;

  return this
} as unknown as ComponentConstructor<any>;
