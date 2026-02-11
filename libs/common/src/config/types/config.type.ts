import { ConfigFactory } from '@nestjs/config';
import { ConfigFactoryKeyHost } from '@nestjs/config/dist/utils/register-as.util';

export type NamespaceFactory = ConfigFactory & ConfigFactoryKeyHost;

export interface AppConfigOptions {
  namespaces?: NamespaceFactory[];
}
