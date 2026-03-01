import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../shared/types';
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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('zeina_user');
      const savedToken = localStorage.getItem('token');
      if (savedUser && savedToken) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      localStorage.removeItem('zeina_user');
      localStorage.removeItem('token');
    }
    setIsLoading(false);
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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
