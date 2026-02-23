/**
 * Wraps drizzle-kit migrate with a PostgreSQL advisory lock
 * to prevent concurrent migrations in multi-instance deployments.
 *
 * Uses the existing `pg` package — no additional dependencies needed.
 *
 * Usage: node docker/migrate-with-lock.mjs <drizzle-config-path>
 * Env:   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *        MIGRATION_LOCK_ID (optional, default: hash of APP_NAME)
 */

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import pg from 'pg';

const MAX_RETRIES = 10;
const RETRY_INTERVAL_MS = 3000;

const configPath = process.argv[2];
if (!configPath) {
  console.error(
    'Usage: node docker/migrate-with-lock.mjs <drizzle-config-path>',
  );
  process.exit(1);
}

function appLockId(appName) {
  const hash = createHash('md5').update(appName).digest();
  return hash.readInt32BE(0);
}

const lockId = process.env.MIGRATION_LOCK_ID
  ? Number(process.env.MIGRATION_LOCK_ID)
  : appLockId(process.env.APP_NAME || 'default');

const dbName = process.env.DB_NAME;
const baseConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// Retry connecting to the default 'postgres' database until PostgreSQL is ready.
async function waitForPostgres() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = new pg.Client({ ...baseConfig, database: 'postgres' });
      await client.connect();
      return client;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(
          `Failed to connect after ${MAX_RETRIES} attempts:`,
          err.message,
        );
        process.exit(1);
      }
      console.log(
        `Database not ready, retrying in ${RETRY_INTERVAL_MS / 1000}s... (${attempt}/${MAX_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    }
  }
}

// 1. Wait for PostgreSQL and ensure the app database exists.
const adminClient = await waitForPostgres();
const { rows } = await adminClient.query(
  'SELECT 1 FROM pg_database WHERE datname = $1',
  [dbName],
);
if (rows.length === 0) {
  await adminClient.query(`CREATE DATABASE "${dbName}"`);
  console.log(`Database "${dbName}" created.`);
}
await adminClient.end();

// 2. Connect to the app database and run migrations with advisory lock.
const client = new pg.Client({ ...baseConfig, database: dbName });
await client.connect();

try {
  console.log(`Acquiring migration lock (id: ${lockId})...`);
  await client.query('SELECT pg_advisory_lock($1)', [lockId]);
  console.log('Lock acquired. Running migrations...');

  execSync(`pnpm drizzle-kit migrate --config ${configPath}`, {
    stdio: 'inherit',
  });

  console.log('Migrations complete. Releasing lock...');
  await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
