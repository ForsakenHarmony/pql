import { Client } from '@pql/client';
import { createContext } from 'preact';

export const PQLContext = createContext<Client | null>(null);
export const Provider = PQLContext.Provider;
export const Consumer = PQLContext.Consumer;
