import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { JwtPayload } from './types';

const BCRYPT_ROUNDS = 12;

function getSecret(env: { JWT_SECRET?: string }): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET || 'fallback-secret-do-not-use');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(
  user: { id: string; email: string; name: string; org_id?: string; role?: string },
  env: { JWT_SECRET?: string; ACCESS_TOKEN_EXPIRE_MINUTES?: string }
): Promise<string> {
  const expiresIn = parseInt(env.ACCESS_TOKEN_EXPIRE_MINUTES || '1440');
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    org_id: user.org_id || '',
    role: (user.role as any) || 'MEMBER',
  };
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}m`)
    .sign(getSecret(env));
}

export async function verifyToken(
  token: string,
  env: { JWT_SECRET?: string }
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(env));
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
