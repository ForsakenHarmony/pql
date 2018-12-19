import test from 'ava';

import { Client, gql } from '@pql/client';
import { FetchTransport } from '@pql/fetch';
import fetch from 'node-fetch';

test('works :^)', async t => {
  const transport = new FetchTransport({ url: 'https://graphql-pokemon.now.sh', fetch: fetch as any });

  const client = new Client(transport);

  const query = gql`
    query {
      pokemon(name: "Pikachu") {
        number
        name
        attacks {
          special {
            name
            type
            damage
          }
        }
      }
    }
  `;

  const res = await client.query<{ pokemon: any }, {}>({ query });
  console.log(res);
  t.truthy(res);
});
