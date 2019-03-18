import { hashStr } from './hash';

export function hashRequest(query: string, variables: any = {}): string {
  return hashStr(JSON.stringify({ query, variables })).toString(16);
}

export interface GqlRequest<V> {
  hash: string;
  query: string;
  variables?: V;
}

export function createRequest<V>(query: string, variables?: V): GqlRequest<V> {
  return {
    hash: hashRequest(query, variables),
    query,
    variables,
  };
}
