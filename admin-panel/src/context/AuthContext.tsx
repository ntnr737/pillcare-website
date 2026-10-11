'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, AdminRole, AdminPermission } from '@/types/admin';
import { getStoredAdminSession, saveAdminSession, clearAdminSession } from '@/lib/auth/session';
import { hasPermission as checkRolePermission } from '@/lib/auth/rbac';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AdminUser, token: string) => void;
  logout: () => void;
  revokeSession: (sessionId: string) => void;
  revokeAllOtherSessions: () => void;
  updateUserRole: (newRole: AdminRole) => void;
  updateUserPermissions: (newPerms: AdminPermission[]) => void;
  hasPermission: (permission: AdminPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { user: storedUser, token: storedToken } = getStoredAdminSession();
    if (storedUser && storedToken) {
      const backendUrl = (process.env.NEXT_PUBLIC_PILLCARE_BACKEND_URL || 'https://pillcare-backend-1082668880575.europe-west1.run.app').replace(/\/$/, '');
      fetch(`${backendUrl}/api/admin/auth/session`, { cache: 'no-store', headers: { Authorization: `Bearer ${storedToken}` } }).then(async (r) => {
        if (!r.ok) { clearAdminSession(); setUser(null); setToken(null); return; }
        const data = await r.json(); setUser(data.user); setToken(storedToken);
      }).catch(() => { clearAdminSession(); setUser(null); setToken(null); }).finally(() => setIsLoading(false));
    } else { setUser(null); setToken(null); setIsLoading(false); }
  }, []);

  const login = (newUser: AdminUser, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    saveAdminSession(newUser, newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearAdminSession();
  };

  const revokeSession = (sessionId: string) => {
    if (!user) return;
    const updated = {
      ...user,
      activeSessions: user.activeSessions.filter((s) => s.sessionId !== sessionId),
    };
    setUser(updated);
    if (token) saveAdminSession(updated, token);
  };

  const revokeAllOtherSessions = () => {
    if (!user) return;
    const updated = {
      ...user,
      activeSessions: user.activeSessions.filter((s) => s.isCurrent),
    };
    setUser(updated);
    if (token) saveAdminSession(updated, token);
  };

  const updateUserRole = (newRole: AdminRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    if (token) saveAdminSession(updated, token);
  };

  const updateUserPermissions = (newPerms: AdminPermission[]) => {
    if (!user) return;
    const updated = { ...user, customPermissions: newPerms };
    setUser(updated);
    if (token) saveAdminSession(updated, token);
  };

  const canAccess = (permission: AdminPermission): boolean => {
    if (!user) return false;
    return checkRolePermission(user.role, user.customPermissions, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        revokeSession,
        revokeAllOtherSessions,
        updateUserRole,
        updateUserPermissions,
        hasPermission: canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
