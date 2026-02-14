import type {
  InjectionToken,
  OptionalFactoryDependency,
  Type,
} from '@nestjs/common';
import { LOG_LEVELS } from '../logger.constants';

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface AppLoggerOptions {
  level?: LogLevel;
  prettyPrint?: boolean;
  exclude?: string[];
  logToFile?: boolean;
  logDir?: string;
  logRetentionDays?: number;
  redactPaths?: string[];
}

export interface AppLoggerAsyncOptions {
  imports?: Type[];
  useFactory: (...args: any[]) => AppLoggerOptions | Promise<AppLoggerOptions>;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}
