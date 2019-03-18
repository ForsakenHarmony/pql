# @pql/boost

## Basic Usage

```tsx
import { createClient, Provider, useQuery, gql } from '@pql/boost';

const client = createClient('https://graphql-pokemon.now.sh');

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

function App() {
  return (
    <Provider value={client}>
      <ExampleComponent />
    </Provider>
  );
}

function ExampleComponent() {
  const [{ data, fetching }] = useQuery({ query });

  if (fetching) {
    return <p>Loading ...</p>;
  }

  return (
    <ul>
      <li>#{data.pokemon.number}</li>
      <li>#{data.pokemon.name}</li>
    </ul>
  );
}
```

## API

### Exports

#### `gql`

```ts
gql`...` | gql('...');
```

A convenience method, helps with editor support, doesn't do anyhting right now

#### `createClient`

```ts
createClient(
  url: string,
  headers?: object
) => Client
```

Takes your endpoing url and optionally an object with headers and returns a client instance.

#### `<Provider />`

```tsx
<Provider value={Client}> ... </Provider>
```

pql's context provider, has to be higher up in the tree than any components using the hooks

#### `useQuery`

```ts
useQuery({
  query: string,
  variables?: object
}) => [{
  fetching: boolean,
  data?: object,
  error?: Error
}]
```

Takes a query + optionally variables and returns an array with the result object as the first element.

#### `useMutation`

```ts
useMutation(
  query: string
) => [
  {
    fetching: boolean;
    data?: object;
    error?: Error;
  },
  executeMutation(
    variables?: object
  ) => Promise<{
    data: object,
    error: Error
  }>
];
```

Takes the mutation and returns the result object + a function to pass variables to actually send the mutation
