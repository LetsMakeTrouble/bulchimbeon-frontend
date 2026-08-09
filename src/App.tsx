import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SseProvider } from './context/SseContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ChatPage } from './pages/ChatPage';
import { QuestionsListPage } from './pages/QuestionsListPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { InboxPage } from './pages/InboxPage';
import { MembersPage } from './pages/MembersPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';

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
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="questions" element={<QuestionsListPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="projects/new" element={<ProjectsPage />} />
          </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
