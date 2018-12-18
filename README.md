# pql

A lightweight™ modular™ graphql client

## Basic Usage

```js
import { Client, gql } from '@pql/client';
// could also use the websocket transport for subscription support
import { FetchTransport } from '@pql/fetch';

const transport = new FetchTransport({ url: 'https://graphql-pokemon.now.sh' });

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

client.query(query).then(res => {
  const pikachu = res.data.pokemon;
  console.log(pikachu);
});
```
