import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../api/client';
import type { User } from '../types';

interface ImpersonationState {
  active: boolean;
  companyName: string | null;
  companyId: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  impersonation: ImpersonationState;
  enterCompany: (companyId: string) => Promise<void>;
  exitCompany: () => Promise<void>;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationState>({
    active: !!localStorage.getItem('crm_impersonate_company_id'),
    companyName: localStorage.getItem('crm_impersonate_company_name'),
    companyId: localStorage.getItem('crm_impersonate_company_id'),
  });

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(() => {
        api.clearSession();
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;

    const heartbeat = () => {
      api.updatePresence()
        .then(({ lastSeenAt }) => {
          setUser((currentUser) => currentUser ? { ...currentUser, lastSeenAt } : currentUser);
        })
        .catch(() => {});
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, 60_000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, token, refreshToken } = await api.login(email, password);
    api.storeSession(token, refreshToken);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Clear local session even if the token is already invalid or the request fails.
    }
    api.clearSession();
    setUser(null);
    setImpersonation({ active: false, companyName: null, companyId: null });
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
  }, []);

  const enterCompany = useCallback(async (companyId: string) => {
    const { token, company } = await api.impersonateCompany(companyId);
    api.storeSession(token);
    localStorage.setItem('crm_impersonate_company_name', company.name);
    localStorage.setItem('crm_impersonate_company_id', company.id);

    setImpersonation({ active: true, companyName: company.name, companyId: company.id });

    // Reload user with new company context
    const me = await api.getMe();
    setUser(me);
  }, []);

  const exitCompany = useCallback(async () => {
    await api.exitImpersonation();
    localStorage.removeItem('crm_impersonate_company_name');
    localStorage.removeItem('crm_impersonate_company_id');

    setImpersonation({ active: false, companyName: null, companyId: null });

    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      // Original token expired — force full logout
      api.clearSession();
      setUser(null);
    }
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, impersonation, enterCompany, exitCompany, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
