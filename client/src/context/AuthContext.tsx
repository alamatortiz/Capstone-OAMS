import React, { createContext, useContext, useMemo, useState } from 'react';

type Role = 'student' | 'professor' | 'admin';

type UserData = {
  name: string;
  email: string;
  role: Role;
  studentId?: string;
};

type AuthContextValue = {
  user: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function guessRoleFromEmail(email: string): Role {
  const lower = email.toLowerCase();
  if (lower.startsWith('admin@')) return 'admin';
  if (lower.startsWith('professor@')) return 'professor';
  return 'student';
}

function guessNameFromEmail(email: string): string {
  const lowerEmail = email.toLowerCase();
  if (lowerEmail === 'student@pnc.edu.ph') {
    return 'John Doe';
  }

  const localPart = email.split('@')[0];
  if (!localPart) return 'User';

  // Turn `first.last` or `first_last` into `First Last`
  const cleaned = localPart.replace(/[_\.]+/g, ' ');
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function guessStudentIdFromEmail(email: string): string | undefined {
  const lowerEmail = email.toLowerCase();
  if (lowerEmail === 'student@pnc.edu.ph') {
    return '2300000';
  }
  return undefined;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => {
    const raw = localStorage.getItem('oams_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserData;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string) => {
    // Stubbed auth (no backend in this repo).
    // - Any password works (your Login page says: Password: any)
    // - Role auto-detected by email prefix

    if (!email || !password) {
      throw new Error('Missing credentials');
    }

    // simulate latency
    await new Promise((r) => setTimeout(r, 250));

    const role = guessRoleFromEmail(email);
    const nextUser: UserData = {
      name: guessNameFromEmail(email),
      email,
      role,
      studentId: guessStudentIdFromEmail(email),
    };

    localStorage.setItem('oams_user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem('oams_user');
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

