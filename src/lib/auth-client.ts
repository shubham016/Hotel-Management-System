const TOKEN_KEY = 'hne_access_token';
const PROFILE_KEY = 'hne_session_profile';
const REFRESH_KEY = 'hne_refresh_token';

export type SessionProfile = {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  properties?: { id: string; code: string; name: string }[];
};

export const authClient = {
  token: () => window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY),
  refreshToken: () => window.localStorage.getItem(REFRESH_KEY) || window.sessionStorage.getItem(REFRESH_KEY),
  profile: (): SessionProfile | null => {
    const raw = window.localStorage.getItem(PROFILE_KEY) || window.sessionStorage.getItem(PROFILE_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  save(data: SessionProfile & { token: string; refreshToken?: string }, persistent: boolean) {
    const storage = persistent ? window.localStorage : window.sessionStorage;
    const other = persistent ? window.sessionStorage : window.localStorage;
    other.removeItem(TOKEN_KEY); other.removeItem(PROFILE_KEY); other.removeItem(REFRESH_KEY);
    storage.setItem(TOKEN_KEY, data.token);
    if (data.refreshToken) storage.setItem(REFRESH_KEY, data.refreshToken);
    storage.setItem(PROFILE_KEY, JSON.stringify({ email: data.email, firstName: data.firstName, lastName: data.lastName, role: data.role, properties: data.properties }));
  },
  clear() {
    [window.localStorage, window.sessionStorage].forEach(storage => { storage.removeItem(TOKEN_KEY); storage.removeItem(PROFILE_KEY); storage.removeItem(REFRESH_KEY); });
  }
};
