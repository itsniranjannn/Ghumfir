import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, API_BASE } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true));
  }, []);

  const finish = (d) => {
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  };
  const login = useCallback(async (email, password) => finish(await api('/auth/login', { method: 'POST', body: { email, password } })), []);
  const register = useCallback(async (body) => api('/auth/register', { method: 'POST', body }), []);
  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);
  const updateProfile = useCallback(async (body) => {
    const d = await api('/auth/me', { method: 'PUT', body });
    setUser(d.user);
    return d.user;
  }, []);
  const uploadAvatar = useCallback(async (file) => {
    if (file.size > 6 * 1024 * 1024) throw new Error('Image is larger than 6 MB');
    const res = await fetch(`${API_BASE}/api/auth/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenStore.get()}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Avatar upload failed');
    setUser(d.user);
    return d.user;
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, updateProfile, uploadAvatar }), [user, ready, login, register, logout, updateProfile, uploadAvatar]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
