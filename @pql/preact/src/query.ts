import { Client } from '@pql/client';
import {
  Component,
  ComponentChild,
  ComponentConstructor,
  RenderableProps,
} from 'preact';
import { assign, dEql, EMPTY_OBJECT, hashOp, noop, overrideOp } from './util';
import { runQuery } from './common';
import { IOperation } from './index';

interface QueryState<T, Vars> {
  loaded: boolean;
  loading: boolean;
  error?: any;
  data: T | null;
  query: IOperation<Vars>;
}

interface FetchMoreOpts<T, Vars> {
  query?: IOperation<Vars>;
  variables?: Vars;
  updateQuery?: (prev: T | null, next: T) => T;
  skipCache?: boolean;
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
  const state: QueryState<T, Vars> = {
    loaded: !!props.skip,
    loading: !props.skip,
    data: null,
    query: props.query,
  };
  let unsub = noop;
  let hashes: string[] = [];

  const rerender = () => this.setState(EMPTY_OBJECT);
  this.componentDidMount = () => {
    fetch();
    unsub = client.onInvalidate(hash => hashes.includes(hash) && fetch());
  };
  this.componentDidUpdate = () =>
    !dEql(state.query, this.props.query) && fetch();
  this.componentWillUnmount = () => unsub();

  const fetch = ({
    query,
    variables,
    updateQuery,
    skipCache,
  }: FetchMoreOpts<T, Vars> = {}) => {
    state.loading = true;
    state.query = overrideOp(overrideOp(this.props.query, query), {
      variables,
    });
    const hash = hashOp(state.query);
    if (!hashes.includes(hash)) hashes.push(hash);
    rerender();

    return runQuery<T, Vars>(
      client,
      assign(
        {
          data: state.data,
          updateQuery,
          skipCache,
        },
        state.query
      )
    ).then(res => {
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
