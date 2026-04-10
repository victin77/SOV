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
    active: !!localStorage.getItem('crm_original_token'),
    companyName: localStorage.getItem('crm_impersonate_company_name'),
    companyId: localStorage.getItem('crm_impersonate_company_id'),
  });

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (token) {
        api.getMe()
          .then(setUser)
          .catch(() => {
            api.clearSession();
          })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
    localStorage.setItem('crm_user', JSON.stringify(u));
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
    localStorage.setItem('crm_user', JSON.stringify(u));
  }, []);

  const enterCompany = useCallback(async (companyId: string) => {
    const currentToken = localStorage.getItem('crm_token')!;
    const currentRefreshToken = localStorage.getItem('crm_refresh_token');
    const { token, company } = await api.impersonateCompany(companyId);

    // Save original token before switching
    if (!localStorage.getItem('crm_original_token')) {
      localStorage.setItem('crm_original_token', currentToken);
      if (currentRefreshToken) {
        localStorage.setItem('crm_original_refresh_token', currentRefreshToken);
      }
    }

    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_impersonate_company_name', company.name);
    localStorage.setItem('crm_impersonate_company_id', company.id);

    setImpersonation({ active: true, companyName: company.name, companyId: company.id });

    // Reload user with new company context
    const me = await api.getMe();
    setUser(me);
  }, []);

  const exitCompany = useCallback(async () => {
    const originalToken = localStorage.getItem('crm_original_token');
    const originalRefreshToken = localStorage.getItem('crm_original_refresh_token');
    if (!originalToken) return;

    localStorage.setItem('crm_token', originalToken);
    if (originalRefreshToken) {
      localStorage.setItem('crm_refresh_token', originalRefreshToken);
    }
    localStorage.removeItem('crm_original_token');
    localStorage.removeItem('crm_original_refresh_token');
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
