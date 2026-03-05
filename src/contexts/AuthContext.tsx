import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../lib/types';
import { setToken, ApiUser } from '../lib/api';

export interface AuthUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  providerId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (apiUser: ApiUser, token: string) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  switchRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) { setIsLoading(false); return; }

    // Validate token with server — prevents stale sessions and fixes auth-on-refresh
    setToken(savedToken);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(serverUser => {
        if (serverUser) {
          const authUser: AuthUser = {
            id: serverUser.id, name: serverUser.name, phone: serverUser.phone,
            email: serverUser.email, role: serverUser.role as UserRole,
            avatar: serverUser.avatar, providerId: serverUser.providerId,
          };
          setUser(authUser);
          localStorage.setItem('zeina_user', JSON.stringify(authUser));
        } else {
          // Token invalid or expired — clear session
          setToken(null);
          localStorage.removeItem('zeina_user');
          localStorage.removeItem('token');
        }
      })
      .catch(() => {
        // Network error — fall back to cached user so app still works offline
        try {
          const saved = localStorage.getItem('zeina_user');
          if (saved) setUser(JSON.parse(saved));
        } catch { /* ignore */ }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (apiUser: ApiUser, token: string) => {
    const authUser: AuthUser = {
      id: apiUser.id,
      name: apiUser.name,
      phone: apiUser.phone,
      email: apiUser.email,
      role: apiUser.role as UserRole,
      avatar: apiUser.avatar,
      providerId: apiUser.providerId,
    };
    setUser(authUser);
    setToken(token);
    localStorage.setItem('zeina_user', JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('zeina_user');
    localStorage.removeItem('token');
  };

  // Dev-only: switch between demo users without re-authenticating
  const switchRole = (role: UserRole) => {
    if (!user) return;
    const demoProfiles: Record<UserRole, Partial<AuthUser>> = {
      [UserRole.ADMIN]:    { id: 'admin-1',  name: 'المدير',        providerId: undefined },
      [UserRole.PROVIDER]: { id: 'user-p1',  name: 'ليلى أحمد',    providerId: 'p1' },
      [UserRole.CLIENT]:   { id: 'user-c1',  name: 'نورة العتيبي', providerId: undefined },
    };
    const next: AuthUser = { ...user, ...demoProfiles[role], role };
    setUser(next);
    localStorage.setItem('zeina_user', JSON.stringify(next));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
