import { Client } from '@pql/client';
import {
  Component,
  ComponentChild,
  ComponentConstructor,
  RenderableProps,
} from 'preact';
import { assign, EMPTY_OBJECT, overrideOp } from './util';
import { runQuery } from './common';
import { IOperation } from './index';

interface QueryState<T> {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
}

interface FetchMoreOpts<T, Vars> {
  query?: IOperation<Vars>;
  variables?: Vars,
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

export const Query: ComponentConstructor<
  QueryProps<any, any>
> = (function Query<
  T,
  Vars = {},
  Props extends QueryProps<T, Vars> = QueryProps<T, Vars>
>(
  this: Component<Props>,
  props: RenderableProps<Props>,
  { client }: { client: Client }
): Component<Props> {
  const state: QueryState<T> = {
    loaded: !!props.skip,
    loading: !props.skip,
    error: null,
    data: null
  };

  const rerender = () => this.setState(EMPTY_OBJECT);
  this.componentDidMount = () => fetch();
  this.componentDidUpdate = (prev: Readonly<Props>) =>
    prev.query !== this.props.query && fetch();

  const fetch = ({ query, variables, updateQuery }: FetchMoreOpts<T, Vars> = {}) => {
    state.loading = true;
    rerender();

    return runQuery<T, Vars>(client, assign({
      data: state.data,
      updateQuery,
    }, overrideOp(overrideOp(this.props.query, query), { variables }))).then(res => {
      state.loading = false;
      state.loaded = true;
      assign(state, res);
      rerender();
      return res;
    });
  };

  function buildResult(): QueryResult<T, Vars> {
    return assign(state, {
      fetchMore: fetch,
    });
  }

  //@ts-ignore
  this.render = props => props.children[0](buildResult()) || null;

  return this;
} as unknown) as ComponentConstructor<QueryProps<any, any>>;
