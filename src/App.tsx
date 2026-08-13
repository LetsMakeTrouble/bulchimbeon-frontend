import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SseProvider } from './context/SseContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { QuestionsListPage } from './pages/QuestionsListPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { InboxPage } from './pages/InboxPage';
import { MembersPage } from './pages/MembersPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OfficialQAsPage } from './pages/OfficialQAsPage';

// 새로고침·첫 진입 시에는 어느 경로에 있었든 대시보드부터 보여준다.
// (요구사항: 열람 시 대시보드가 먼저 → 프로젝트 선택 → 상세 탭 진입)
// 모듈 레벨 플래그라 최초 로드에 딱 한 번만 동작하고, 이후 앱 내 이동은 건드리지 않는다.
let bootRedirected = false;
function BootRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    if (bootRedirected) return;
    bootRedirected = true;
    const path = window.location.pathname;
    if (path !== '/' && path !== '/login' && path !== '/signup') {
      navigate('/', { replace: true });
    }
  }, [navigate]);
  return null;
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-surface-subtle text-[13px] text-ink-muted">
        <Loader2 className="size-5 animate-spin" />
        <span>인증 상태 확인 중…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SseProvider>
          <BootRedirect />
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 첫 화면 — Figma 대시보드. 자체 사이드바/정보 패널을 가지므로 Layout 밖에 둔다. */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* 프로젝트 선택 후 진입하는 상세 화면들 — 기존 Layout(사이드바 탭) 유지 */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="chat" element={<ChatPage />} />
            <Route path="questions" element={<QuestionsListPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="official-qas" element={<OfficialQAsPage />} />
            <Route path="inbox" element={<InboxPage />} />
            {/* 교훈·지표는 인박스 허브의 탭으로 통합 — 이전 경로는 리다이렉트로 살린다 */}
            <Route path="lessons" element={<Navigate to="/inbox?tab=lessons" replace />} />
            <Route path="metrics" element={<Navigate to="/inbox?tab=metrics" replace />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
