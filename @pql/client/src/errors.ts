import { GraphQLError } from 'graphql';

function generateErrorMessage(
  graphQLErrors: ReadonlyArray<GraphQLError> = [],
  networkError?: Error
) {
  let error = '';
  if (networkError !== undefined) {
    error = `[Network] ${networkError.message}`;
    return error;
  }

  if (graphQLErrors !== undefined) {
    graphQLErrors.forEach(err => {
      error += `[GraphQL] ${err.message || 'Error message not found.'}\n`;
    });
  }

  return error.trim();
}

export class PqlError extends Error {
  __proto__ = Error;
  constructor(
    errorMessage?: string,
    public graphQLErrors: ReadonlyArray<GraphQLError> = [],
    public networkError?: Error
  ) {
    super(errorMessage || generateErrorMessage(graphQLErrors, networkError));

    // workaround for ja🅱ascript stupidity
    Object.setPrototypeOf(this, PqlError.prototype);
    if (Error.captureStackTrace) Error.captureStackTrace(this, PqlError);
  }
}

export function graphqlError(graphQLErrors: ReadonlyArray<GraphQLError>) {
  return new PqlError(
    void 0,
    Array.isArray(graphQLErrors) ? graphQLErrors : [graphQLErrors]
  );
}

export function networkError(networkError: Error) {
  return new PqlError(void 0, void 0, networkError);
}
