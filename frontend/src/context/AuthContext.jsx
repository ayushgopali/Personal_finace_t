import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

// Mirrors initAuthState/updateAuthUi from app.js.
// Session/token handling stays server-side; React only reflects /api/auth/me.
const AuthContext = createContext({
  isAuthenticated: false,
  user: { name: 'Pranav', email: '', picture: '' },
  loading: true,
  refresh: async () => {},
  logout: async () => {}
});

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({ name: 'Pranav', email: '', picture: '' });
  const [loading, setLoading] = useState(true);

  const applyAuthState = useCallback((authState) => {
    const authenticated = Boolean(authState?.authenticated);
    const raw = authState?.user || {};
    setIsAuthenticated(authenticated);
    setUser({
      name: raw.name || 'Pranav',
      email: raw.email || '',
      picture: raw.picture || ''
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const authState = await api.me();
      applyAuthState(authState);
    } catch {
      applyAuthState({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }, [applyAuthState]);

  const logout = useCallback(async () => {
    const result = await api.logout();
    setIsAuthenticated(false);
    setUser({ name: 'Pranav', email: '', picture: '' });
    return result;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ isAuthenticated, user, loading, refresh, logout, setAuthState: applyAuthState }),
    [isAuthenticated, user, loading, refresh, logout, applyAuthState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
