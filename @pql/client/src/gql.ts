// import { OperationVariables } from './types';
// import { Client } from './index';
import { PqlError } from './errors';

interface QueryDetails {
  operationType: 'query' | 'mutation' | 'subscription';
  operationName: string;
}

// const cache: { [key: string]: QueryDetails } = {};

const getOpname = /^(?:(query|mutation|subscription)(?:\s+([_A-Za-z][_0-9A-Za-z]*))?[^{]*?\s*)?{/;

export function analyzeQuery(query: string): QueryDetails {
  // if (cache[query]) return cache[query];
  const res = getOpname.exec(query);
  if (!res) throw new PqlError('Could not parse the query');
  const [, operationType = 'query', operationName] = res;
  const details = {
    operationName,
    operationType: operationType as QueryDetails['operationType'],
  };
  // cache[query] = details;
  return details;
}

export function gql(str: string | TemplateStringsArray): string {
  const query = (Array.isArray(str) ? str.join('') : <string>str).trim();
  // if (!cache[query]) {
  //   analyzeQuery(query);
  // }
  return query;

  // function factory(
  //   client: Client,
  //   extra: object = {},
  //   variables: Vars = {} as Vars,
  // ) {
  //   const hash = Client.hash(query, variables);
  //   return Object.assign(extra, {
  //     client,
  //     hash,
  //     operationType: (typ as any) || 'query',
  //     operation: {
  //       query,
  //       operationName: name,
  //       variables,
  //     },
  //   });
  // }
}
