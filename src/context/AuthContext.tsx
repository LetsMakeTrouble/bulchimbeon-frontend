import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, UserProjectSummary } from '../types';
import { authApi } from '../api/auth';

interface AuthContextType {
  user: User | null;
  projects: UserProjectSummary[];
  activeProject: UserProjectSummary | null;
  setActiveProject: (project: UserProjectSummary | null) => void;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<UserProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<UserProjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      setProjects(data.projects);
      if (data.projects.length > 0) {
        // preserve selected active project if exists in new list
        setActiveProject((prev) => {
          if (prev) {
            const found = data.projects.find((p) => p.id === prev.id);
            if (found) return found;
          }
          return data.projects[0];
        });
      } else {
        setActiveProject(null);
      }
    } catch (err) {
      setUser(null);
      setProjects([]);
      setActiveProject(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      refreshMe();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (token: string, refreshToken: string, userData: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    setUser(userData);
    await refreshMe();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setProjects([]);
    setActiveProject(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        projects,
        activeProject,
        setActiveProject,
        isLoading,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
