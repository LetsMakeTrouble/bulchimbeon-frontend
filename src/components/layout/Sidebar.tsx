import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Inbox,
  FileText,
  Settings,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { activeProject } = useAuth();

  const isAnswerer = activeProject?.role === 'answerer';

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            메뉴
          </div>
          <nav className="space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <MessageSquare className="w-4 h-4" />
              <span>질문 목록</span>
            </NavLink>

            {/* Answerer Inbox Queue */}
            <NavLink
              to="/inbox"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Inbox className="w-4 h-4 text-purple-400" />
                <span>담당자 인박스</span>
              </div>
              {isAnswerer && (activeProject?.pending_cards || 0) > 0 && (
                <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {activeProject?.pending_cards}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/documents"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <FileText className="w-4 h-4" />
              <span>지식 베이스 문서</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Settings className="w-4 h-4" />
              <span>지침 및 프로젝트 설정</span>
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4" />
                <span>알림함</span>
              </div>
              {(activeProject?.unread_notifications || 0) > 0 && (
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {activeProject?.unread_notifications}
                </span>
              )}
            </NavLink>
          </nav>
        </div>
      </div>

      {/* AI Guardrail Info Box */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800/80 space-y-2">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>신뢰 기반 3단 분기</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          AI는 등록된 근거 문서에서만 답변합니다. 근거 미흡 시 🔴 보류, 일부 확인 시 🟡 대기로 담당자에게 이관됩니다.
        </p>
      </div>
    </aside>
  );
};
