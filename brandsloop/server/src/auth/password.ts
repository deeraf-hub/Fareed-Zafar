import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Password policy applied on registration and password change. Deliberately
 * modest but non-trivial — staff accounts are created by an admin, not the
 * public internet.
 */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('be at least 8 characters long');
  if (!/[a-z]/.test(password)) problems.push('contain a lowercase letter');
  if (!/[A-Z]/.test(password)) problems.push('contain an uppercase letter');
  if (!/[0-9]/.test(password)) problems.push('contain a number');
  return problems;
}
