import {
  Client,
  CtxFactory,
  noop,
  OperationOptions,
  OperationVariables,
} from '@pql/client';
import { Component, ComponentChild, RenderableProps } from 'preact';

type ProviderProps = { client: Client; children: any };

export class Provider extends Component<ProviderProps> {
  getChildContext(): object {
    return { client: this.props.client };
  }

  render(props: RenderableProps<ProviderProps>) {
    return props.children[0];
  }
}

type QueryState<Vars> = {
  loading: boolean;
  error?: any;
  data?: any;
  query: CtxFactory<Vars>;
  variables?: Vars;
};

type FetchMoreOpts<Vars> = {
  updateQuery?: (prev: any, next: any) => any;
} & Partial<OperationOptions<Vars>>;

type QueryResult<Vars> = {
  loading: boolean;
  error?: any;
  data?: any;
  variables?: Vars;
  refetch: (variables?: Vars) => void;
  fetchMore: (opts: FetchMoreOpts<Vars>) => any;
};

type QueryProps<Vars> = {
  children: (opts: QueryResult<Vars>) => ComponentChild;
  skip?: boolean;
  query: CtxFactory<Vars>;
  variables?: Vars;
};

export class Query<Vars = OperationVariables> extends Component<
  QueryProps<Vars>,
  QueryState<Vars>
> {
  constructor(props: RenderableProps<QueryProps<Vars>>) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      data: null,
      query: props.query,
      variables: props.variables,
    };
  }

  componentDidMount(): void {
    this.fetch()
      .then(res => {
        this.setState({
          loading: false,
          data: res.data,
          error: res.error,
        });
      })
      .catch(noop);
  }

  componentWillReceiveProps(next: Readonly<QueryProps<Vars>>): void {
    if (
      next.query !== this.props.query ||
      next.variables !== this.props.variables
    ) {
      this.setState(
        {
          query: next.query,
          variables: next.variables,
        },
        () => {
          this.fetch().catch(noop);
        }
      );
    }
  }

  fetch(query?: CtxFactory<Vars>, variables?: Vars) {
    return new Promise(res => {
      this.setState(
        Object.assign(
          { loading: true },
          query && { query },
          variables && { variables }
        ),
        () => {
          res();
        }
      );
    })
      .then(() =>
        (this.context.client as Client).query({
          query: this.state.query,
          variables: this.state.variables,
        })
      )
      .catch(err => {
        this.setState({
          loading: false,
          error: err,
        });
        throw err;
      });
  }

  fetchMore({ query, variables, updateQuery }: FetchMoreOpts<Vars>) {
    this.fetch(query, variables)
      .then(res => {
        this.setState({
          error: res.error,
        });
        return updateQuery && updateQuery(this.state.data, res.data);
      })
      .then((data = this.state.data) => {
        this.setState({
          loading: false,
          data: data,
        });
      })
      .catch(noop);
  }

  buildResult(): QueryResult<Vars> {
    const { loading, error, data, variables } = this.state;

    return {
      loading,
      error,
      data,
      refetch: vars => this.fetch(void 0, vars).catch(noop),
      variables,
      fetchMore: this.fetchMore.bind(this),
    };
  }

  render(props: RenderableProps<QueryProps<Vars>>): ComponentChild {
    return props && props.children(this.buildResult());
  }
}

type MutationState<Vars> = {
  loading: boolean;
  error?: any;
  data?: any;
  mutation: CtxFactory<Vars>;
  variables?: Vars;
};

type MutationResult<Vars> = {
  loading: boolean;
  error?: any;
  data?: any;
  variables?: Vars;
};

type MutationProps<Vars> = {
  children: (opts: MutationResult<Vars>) => ComponentChild;
  mutation: CtxFactory<Vars>;
  variables: Vars;
};

export class Mutation<Vars = OperationVariables> extends Component<
  MutationProps<Vars>,
  MutationState<Vars>
> {
  componentDidMount(): void {
    const { mutation, variables } = this.props;
    const { client }: { client: Client } = this.context;

    client
      .mutate({
        query: mutation,
        variables,
      })
      .then(res => {
        this.setState({
          loading: false,
          data: res.data,
          error: res.errors,
        });
      })
      .catch(err => {
        this.setState({
          loading: false,
          error: err,
        });
      });
  }

  buildResult(): MutationResult<Vars> {
    const { loading, error, data, variables } = this.state;

    return {
      loading,
      error,
      data,
      variables,
    };
  }

  render(props: RenderableProps<MutationProps<Vars>>): ComponentChild {
    return props && props.children(this.buildResult());
  }
}
