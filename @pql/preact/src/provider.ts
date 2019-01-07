import { Client } from '@pql/client';
import { Component, ComponentConstructor, RenderableProps } from 'preact';

interface ProviderProps {
  client: Client;
  children: any;
}

export const Provider = (function(this: Component<ProviderProps>) {
  this.getChildContext = () => ({ client: this.props.client });
} as unknown) as ComponentConstructor<ProviderProps>;
Provider.prototype.render = (props: RenderableProps<ProviderProps>) =>
  props.children[0];
