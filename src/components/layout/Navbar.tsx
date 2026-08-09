import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Moon,
  ChevronDown,
  Plus,
  LogOut,
  Bell,
  Sun,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { projectsApi } from '../../api/projects';

interface NavbarProps {
  onOpenAskModal?: () => void;
  onOpenJoinModal?: () => void;
  onOpenCreateModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAskModal,
  onOpenJoinModal,
  onOpenCreateModal,
}) => {
  const { user, projects, activeProject, setActiveProject, logout, refreshMe } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleToggleAway = async () => {
    if (!activeProject || activeProject.role !== 'answerer') return;
    try {
      const res = await projectsApi.toggleAwayMode(activeProject.id, !activeProject.away_mode);
      setActiveProject({ ...activeProject, away_mode: res.away_mode });
      refreshMe();
    } catch (err) {
      console.error('Failed to toggle away mode', err);
    }
  };

  return (
    <nav className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand & Project Switcher */}
      <div className="flex items-center space-x-6">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Moon className="w-5 h-5 text-amber-200 fill-amber-200/20" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-indigo-300 transition">
              불침번
            </span>
            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 ml-2">
              V2 AI
            </span>
          </div>
        </Link>

        <div className="h-5 w-[1px] bg-slate-800" />

        {/* Project Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 text-sm text-slate-200 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition"
          >
            <span className="font-medium max-w-[160px] truncate">
              {activeProject ? activeProject.name : '프로젝트 선택'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                내 프로젝트
              </div>
              <div className="max-h-56 overflow-y-auto my-1">
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400">참여 중인 프로젝트가 없습니다.</div>
                ) : (
                  projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                        activeProject?.id === proj.id ? 'bg-indigo-600/10 text-indigo-300 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      <span className="truncate">{proj.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          proj.role === 'answerer'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        }`}
                      >
                        {proj.role === 'answerer' ? '담당자' : '질문자'}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-slate-800 pt-1 mt-1 px-2 space-y-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenCreateModal?.();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 프로젝트 생성</span>
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenJoinModal?.();
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded flex items-center space-x-1.5 transition"
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>초대 코드로 참여</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {activeProject && (
          <div className="flex items-center space-x-3">
            {/* Role Badge */}
            <div
              className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center space-x-1 ${
                activeProject.role === 'answerer'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{activeProject.role === 'answerer' ? '담당자 (Answerer)' : '질문자 (Asker)'}</span>
            </div>

            {/* Away Mode Toggle for Answerer */}
            {activeProject.role === 'answerer' && (
              <button
                onClick={handleToggleAway}
                title="퇴근 모드 설정 (ON 시 즉시 알림이 방해금지/브리핑으로 배치됩니다)"
                className={`text-xs px-2.5 py-1 rounded-full border transition flex items-center space-x-1.5 font-medium ${
                  activeProject.away_mode
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {activeProject.away_mode ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-300" />
                    <span>퇴근 모드 ON</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>근무 중</span>
                  </>
                )}
              </button>
            )}

            {/* Ask Question Button */}
            <button
              onClick={onOpenAskModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-md shadow-indigo-600/30 transition hover:scale-[1.02] active:scale-95"
            >
              + 질문 등록
            </button>
          </div>
        )}

        {/* Notifications Icon */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <Bell className="w-5 h-5" />
          {user && (activeProject?.unread_notifications || 0) > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-pulse" />
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold text-xs">
              {user?.name?.[0] || 'U'}
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-xs font-semibold text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
