import { Client } from '@pql/client';
import { useContext } from 'react';
import { PQLContext } from './context';

export function useClient(): Client {
  const client = useContext<Client | null>(PQLContext);
  if (!client) throw new Error('No pql client in context');
  return client;
}

export function noop() {}
