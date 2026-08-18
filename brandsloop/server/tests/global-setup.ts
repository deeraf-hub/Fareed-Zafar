import { execSync } from 'node:child_process';
import 'dotenv/config';

/**
 * Applies the current schema to the dedicated test database once per run.
 * `db push --force-reset` gives a clean slate without depending on migration
 * history, which keeps the suite fast and independent of the dev database.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Copy .env.example to .env and point it at a scratch database.',
    );
  }
  execSync('npx prisma db push --force-reset --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
