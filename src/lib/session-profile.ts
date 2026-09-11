import { cookies } from 'next/headers';

export type SessionProfile = {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  properties?: { id: number; code: string; name: string }[];
};

const PROFILE_COOKIE = 'hne_session_profile';

export function encodeSessionProfile(profile: SessionProfile) {
  return Buffer.from(JSON.stringify(profile)).toString('base64url');
}

export function getSessionProfile(): SessionProfile | null {
  const value = cookies().get(PROFILE_COOKIE)?.value;
  if (!value) return null;

  try {
    const profile = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionProfile;
    return typeof profile.email === 'string' ? profile : null;
  } catch {
    return null;
  }
}

export const sessionProfileCookieName = PROFILE_COOKIE;
