import { createContext, useContext, useEffect, useState } from 'react';
import { Auth } from '../services/api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    const raw = localStorage.getItem('hcms_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [ready, setReady]   = useState(!localStorage.getItem('hcms_token'));

  useEffect(() => {
    const tok = localStorage.getItem('hcms_token');
    if (!tok) { setReady(true); return; }
    Auth.me()
      .then((u) => { setUser(u); localStorage.setItem('hcms_user', JSON.stringify(u)); })
      .catch(() => {
        localStorage.removeItem('hcms_token');
        localStorage.removeItem('hcms_user');
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const { user, token } = await Auth.login(email, password);
    localStorage.setItem('hcms_token', token);
    localStorage.setItem('hcms_user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('hcms_token');
    localStorage.removeItem('hcms_user');
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
