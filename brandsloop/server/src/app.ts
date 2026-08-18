import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      // The built SPA is served from the same origin; the default CSP would
      // block its inline module preloads.
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'brandsloop-api', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', authenticate, apiRouter);

  // In production the API also serves the built React client.
  const clientDist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../client/dist',
  );
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
