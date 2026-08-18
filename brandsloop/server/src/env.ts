import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isTest = nodeEnv === 'test';
const isProduction = nodeEnv === 'production';

// In production a weak/default JWT secret is refused outright — a predictable
// signing key means anyone can mint an admin session.
const jwtSecret = required('JWT_SECRET', isProduction ? undefined : 'dev_only_insecure_secret');
if (isProduction && (jwtSecret.length < 32 || jwtSecret.includes('change_me'))) {
  throw new Error('JWT_SECRET must be a unique random string of at least 32 characters in production.');
}

export const env = {
  nodeEnv,
  isTest,
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: isTest
    ? required('TEST_DATABASE_URL', process.env.DATABASE_URL)
    : required('DATABASE_URL'),
  jwtSecret,
  sessionHours: Number(process.env.SESSION_HOURS ?? 12),
  cookieSecure: (process.env.COOKIE_SECURE ?? String(isProduction)) === 'true',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
