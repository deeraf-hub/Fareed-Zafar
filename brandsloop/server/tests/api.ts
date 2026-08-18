import request from 'supertest';
import type { Role } from '@prisma/client';
import { createApp } from '../src/app.js';
import { signSession } from '../src/auth/session.js';
import { createUser } from './helpers.js';

export const app = createApp();

/** Returns a supertest agent already carrying a session for the given role. */
export async function asRole(role: Role, email?: string) {
  const user = await createUser(role, email ?? `${role.toLowerCase()}-${Date.now()}@test.pk`);
  const token = signSession({ sub: user.id, email: user.email, role: user.role });
  const agent = request.agent(app);
  agent.set('Authorization', `Bearer ${token}`);
  return { agent, user };
}

export { request };
