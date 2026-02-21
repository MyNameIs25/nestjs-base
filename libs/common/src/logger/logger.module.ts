import { resolve } from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule, Params } from 'nestjs-pino';
import {
  DEFAULT_LOG_LEVEL,
  DEFAULT_LOG_RETENTION_DAYS,
  DEFAULT_REDACT_PATHS,
} from './logger.constants';
import { AppLogger } from './logger.service';
import type {
  AppLoggerAsyncOptions,
  AppLoggerOptions,
} from './types/logger.type';

// ---------------------------------------------------------------------------
// Resolved options (env vars + defaults merged)
// ---------------------------------------------------------------------------
// Options read process.env directly (not through the config module) because
// the logger must be available before ConfigModule runs — otherwise config
// validation errors during bootstrap would have no logger to report through.

interface ResolvedOptions {
  level: string;
  prettyPrint: boolean;
  logToFile: boolean;
  logDir: string;
  logRetentionDays: number;
  redactPaths: string[];
  exclude: string[];
  isSilent: boolean;
}

function resolveOptions(options: AppLoggerOptions): ResolvedOptions {
  const isDev = process.env.NODE_ENV !== 'production';
  const level =
    options.level ??
    process.env.LOG_LEVEL ??
    (isDev ? 'debug' : DEFAULT_LOG_LEVEL);

  return {
    level,
    prettyPrint: options.prettyPrint ?? isDev,
    logToFile: options.logToFile ?? process.env.LOG_TO_FILE === 'true',
    logDir: options.logDir ?? process.env.LOG_DIR ?? 'logs',
    logRetentionDays:
      options.logRetentionDays ??
      (process.env.LOG_RETENTION_DAYS !== undefined
        ? Number(process.env.LOG_RETENTION_DAYS)
        : DEFAULT_LOG_RETENTION_DAYS),
    redactPaths: options.redactPaths ?? DEFAULT_REDACT_PATHS,
    exclude: options.exclude ?? [],
    isSilent: level === 'silent',
  };
}

// ---------------------------------------------------------------------------
// Transport targets
// ---------------------------------------------------------------------------

interface TransportTarget {
  target: string;
  options: Record<string, unknown>;
}

function buildTransportTargets(opts: ResolvedOptions): TransportTarget[] {
  const targets: TransportTarget[] = [];

  if (opts.prettyPrint && !opts.isSilent) {
    // ignore: responseTimeMs — already included in customSuccessMessage
    targets.push({
      target: 'pino-pretty',
      options: { colorize: true, singleLine: true, ignore: 'responseTimeMs' },
    });
  }

  if (opts.logToFile && !opts.isSilent) {
    // In production with file logging, add explicit stdout target
    if (!opts.prettyPrint) {
      targets.push({ target: 'pino/file', options: { destination: 1 } });
    }
    targets.push({
      target: 'pino-roll',
      options: {
        file: resolve(opts.logDir, 'app.log'),
        frequency: 'daily',
        mkdir: true,
        limit: { count: opts.logRetentionDays },
      },
    });
  }

  return targets;
}

function buildTransportConfig(
  targets: TransportTarget[],
): Record<string, unknown> {
  if (targets.length === 1) return { transport: targets[0] };
  if (targets.length > 1) return { transport: { targets } };
  return {};
}

// ---------------------------------------------------------------------------
// Request log formatting
// ---------------------------------------------------------------------------

function buildRequestLogConfig(opts: ResolvedOptions): Record<string, unknown> {
  return {
    customAttributeKeys: { responseTime: 'responseTimeMs' },
    customLogLevel: (
      _req: IncomingMessage,
      res: ServerResponse,
      err?: Error,
    ): 'error' | 'warn' | 'info' => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    ...(opts.prettyPrint &&
      !opts.isSilent && {
        customSuccessMessage: (
          _req: IncomingMessage,
          res: ServerResponse,
          responseTime: number,
        ) => `request completed [${res.statusCode}] ${responseTime}ms`,
        customErrorMessage: (
          _req: IncomingMessage,
          res: ServerResponse,
          err: Error,
        ) => `request failed [${res.statusCode}] ${err.message}`,
      }),
  };
}

// ---------------------------------------------------------------------------
// Serializers & request ID
// ---------------------------------------------------------------------------

function readRequestId(req: IncomingMessage & { id?: string }): string {
  return req.id ?? `untraced-${crypto.randomUUID()}`;
}

function buildSerializers() {
  return {
    req: (req: IncomingMessage & { id?: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: ServerResponse) => ({
      statusCode: res.statusCode,
    }),
  };
}

// ---------------------------------------------------------------------------
// Assemble final config
// ---------------------------------------------------------------------------

function buildLoggerConfig(options: AppLoggerOptions): Params {
  const opts = resolveOptions(options);
  const targets = buildTransportTargets(opts);

  return {
    pinoHttp: {
      level: opts.level,
      enabled: !opts.isSilent,
      autoLogging: !opts.isSilent,
      base: {
        service: process.env.SERVICE_NAME ?? 'unknown',
        environment: process.env.NODE_ENV ?? 'development',
      },
      redact: [...opts.redactPaths],
      ...buildRequestLogConfig(opts),
      ...buildTransportConfig(targets),
      genReqId: readRequestId,
      serializers: buildSerializers(),
    },
    exclude: opts.exclude,
  };
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

@Module({})
export class AppLoggerModule {
  static forRoot(options: AppLoggerOptions = {}): DynamicModule {
    return {
      module: AppLoggerModule,
      global: true,
      imports: [
        // Defer env var reading to DI resolution time via forRootAsync,
        // so process.env changes in test beforeEach() take effect
        LoggerModule.forRootAsync({
          useFactory: () => buildLoggerConfig(options),
        }),
      ],
      providers: [AppLogger],
      exports: [AppLogger],
    };
  }

  static forRootAsync(asyncOptions: AppLoggerAsyncOptions): DynamicModule {
    return {
      module: AppLoggerModule,
      global: true,
      imports: [
        LoggerModule.forRootAsync({
          imports: asyncOptions.imports,
          useFactory: async (...args: any[]) =>
            buildLoggerConfig(await asyncOptions.useFactory(...args)),
          inject: asyncOptions.inject,
        }),
      ],
      providers: [AppLogger],
      exports: [AppLogger],
    };
  }
}
