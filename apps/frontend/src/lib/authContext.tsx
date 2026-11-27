'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR_OFFICER' | 'PAYROLL_SPECIALIST' | 'ADMINISTRATOR';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  employeeId?: string;
}

export interface DemoAccount {
  role: Role;
  label: string;
  email: string;
  pass: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMINISTRATOR',
    label: 'Administrator',
    email: 'admin@peoplecore.local',
    pass: 'Admin@12345',
    description: 'System governance, user roles, audit trails & incident simulations'
  },
  {
    role: 'HR_OFFICER',
    label: 'HR Officer',
    email: 'hr@peoplecore.local',
    pass: 'Hr@12345',
    description: 'Employee directory, onboarding/offboarding, departments & leave policies'
  },
  {
    role: 'MANAGER',
    label: 'Manager',
    email: 'manager@peoplecore.local',
    pass: 'Manager@12345',
    description: 'Team attendance monitoring, leave approvals & performance reviews'
  },
  {
    role: 'PAYROLL_SPECIALIST',
    label: 'Payroll Specialist',
    email: 'payroll@peoplecore.local',
    pass: 'Payroll@12345',
    description: 'Salary structures, monthly payroll runs, PDF payslips & bank export'
  },
  {
    role: 'EMPLOYEE',
    label: 'Employee (Self-Service)',
    email: 'employee@peoplecore.local',
    pass: 'Employee@12345',
    description: 'Punch in/out, view personal attendance, apply for leave & download payslips'
  }
];

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  switchDemoRole: (role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('peoplecore_user');
    const token = localStorage.getItem('peoplecore_access_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (!loading && !user && pathname !== '/login') router.replace('/login'); }, [loading, user, pathname, router]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password: pass });
      const { accessToken, refreshToken, user: authUser } = res.data.data;
      localStorage.setItem('peoplecore_access_token', accessToken);
      localStorage.setItem('peoplecore_refresh_token', refreshToken);
      localStorage.setItem('peoplecore_user', JSON.stringify(authUser));
      setUser(authUser);
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: Role) => {
    const target = DEMO_ACCOUNTS.find(a => a.role === targetRole);
    if (!target) return;
    await login(target.email, target.pass);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('peoplecore_refresh_token');
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    localStorage.removeItem('peoplecore_access_token');
    localStorage.removeItem('peoplecore_refresh_token');
    localStorage.removeItem('peoplecore_user');
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'ADMINISTRATOR',
        loading,
        login,
        switchDemoRole,
        logout
      }}
    >
      {loading ? <div className="p-8 text-slate-500">Loading session...</div> : (user || pathname === '/login') ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
