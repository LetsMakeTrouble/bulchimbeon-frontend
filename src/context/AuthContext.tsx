import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User, UserProjectSummary } from '../types';
import { authApi } from '../infrastructure/http/auth';

interface AuthContextType {
  user: User | null;
  projects: UserProjectSummary[];
  activeProject: UserProjectSummary | null;
  setActiveProject: (project: UserProjectSummary | null) => void;
  unreadTotal: number;
  setUnreadTotal: (count: number) => void;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_PROJECT_KEY = 'active_project_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<UserProjectSummary[]>([]);
  const [activeProject, setActiveProjectState] = useState<UserProjectSummary | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const setActiveProject = useCallback((project: UserProjectSummary | null) => {
    setActiveProjectState(project);
    if (project) localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    else localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      setProjects(data.projects);
      setUnreadTotal(data.unread_notifications_total);

      // 선택 프로젝트는 새로고침을 견뎌야 한다 — 담당자/질문자 화면이 통째로 갈리기 때문.
      const remembered = localStorage.getItem(ACTIVE_PROJECT_KEY);
      setActiveProjectState((prev) => {
        const wanted = prev?.id ?? remembered;
        return data.projects.find((p) => p.id === wanted) ?? data.projects[0] ?? null;
      });
    } catch {
      setUser(null);
      setProjects([]);
      setActiveProjectState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('access_token')) refreshMe();
    else setIsLoading(false);
  }, [refreshMe]);

  const login = async (token: string, refreshToken: string, userData: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    setUser(userData);
    await refreshMe();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    setUser(null);
    setProjects([]);
    setActiveProjectState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        projects,
        activeProject,
        setActiveProject,
        unreadTotal,
        setUnreadTotal,
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
