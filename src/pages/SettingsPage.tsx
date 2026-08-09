import React, { useEffect, useState } from 'react';
import {
  Settings,
  Clock,
  Key,
  Copy,
  Check,
  Save,
  Loader2,
  Sliders,
  FileCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ProjectDetail, ProjectSettings } from '../types';
import { projectsApi } from '../api/projects';

export const SettingsPage: React.FC = () => {
  const { activeProject, refreshMe } = useAuth();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [guidelines, setGuidelines] = useState('');
  const [settings, setSettings] = useState<Partial<ProjectSettings>>({});
  const [savingGuidelines, setSavingGuidelines] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Copy invite code state
  const [copied, setCopied] = useState(false);

  const fetchDetail = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError('');
    try {
      const proj = await projectsApi.getDetail(activeProject.id);
      setDetail(proj);
      setSettings(proj.settings || {});

      const g = await projectsApi.getGuidelines(activeProject.id);
      setGuidelines(g.content || '');
    } catch (err: any) {
      setError('프로젝트 설정을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [activeProject?.id]);

  const handleSaveGuidelines = async () => {
    if (!activeProject) return;
    setSavingGuidelines(true);
    setSuccessMsg('');
    try {
      await projectsApi.updateGuidelines(activeProject.id, guidelines);
      setSuccessMsg('프로젝트 응답 지침(가드레일)이 저장되었습니다.');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '지침 저장 실패');
    } finally {
      setSavingGuidelines(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeProject) return;
    setSavingSettings(true);
    setSuccessMsg('');
    try {
      const updated = await projectsApi.updateSettings(activeProject.id, settings);
      setSettings(updated);
      setSuccessMsg('프로젝트 인계/임계값 설정이 반영되었습니다.');
      refreshMe();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '설정 저장 실패');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRegenInviteCode = async () => {
    if (!activeProject) return;
    try {
      const res = await projectsApi.regenerateInviteCode(activeProject.id);
      if (detail) setDetail({ ...detail, invite_code: res.invite_code });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '초대 코드 재발급 실패');
    }
  };

  const handleCopyInviteCode = () => {
    if (detail?.invite_code) {
      navigator.clipboard.writeText(detail.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 space-x-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>설정을 불러오는 중입니다...</span>
      </div>
    );
  }

  const isAnswerer = activeProject?.role === 'answerer';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>지침 및 프로젝트 설정</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          응답 가드레일, AI 판단 임계값, DND 방해금지 시간 및 팀원 초대 코드를 관리합니다.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invite Code Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
            <Key className="w-5 h-5" />
            <span>팀원 초대 코드 (Invite Code)</span>
          </div>
          {isAnswerer && (
            <button
              onClick={handleRegenInviteCode}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              재발급
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          팀원이 이 코드를 사용해 프로젝트에 질문자(Asker) 역할로 참여할 수 있습니다.
        </p>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-base tracking-widest text-indigo-300 font-bold select-all">
            {detail?.invite_code || '발급된 코드 없음'}
          </div>
          <button
            onClick={handleCopyInviteCode}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '복사됨!' : '초대 코드 복사'}</span>
          </button>
        </div>
      </div>

      {/* Guidelines Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-purple-400 font-semibold text-sm">
            <FileCode className="w-5 h-5" />
            <span>프로젝트 응답 지침 (AI Guardrails)</span>
          </div>
          {isAnswerer && (
            <button
              onClick={handleSaveGuidelines}
              disabled={savingGuidelines}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow flex items-center space-x-1.5 transition"
            >
              {savingGuidelines ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>지침 저장</span>
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          모든 답변 생성 시 AI 프롬프트에 강제로 주입되는 톤앤매너 및 보안 가드레일 텍스트입니다.
        </p>

        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          disabled={!isAnswerer}
          rows={5}
          placeholder="예: 답변은 친절하고 명확한 톤으로 작성하며, 확인되지 않은 도메인 외부 파라미터는 명시하지 않는다."
          className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none font-mono leading-relaxed"
        />
      </div>

      {/* Thresholds & DND Settings Section (Answerer only) */}
      {isAnswerer && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <Sliders className="w-5 h-5" />
              <span>AI 판단 임계값 및 DND/브리핑 설정</span>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition"
            >
              {savingSettings ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>설정 변경 저장</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thresholds */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
                신뢰 등급 임계값 (Thresholds)
              </h4>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  🟢 즉답 하한선 (`green_threshold`: 0~100)
                </label>
                <input
                  type="number"
                  value={settings.green_threshold ?? 80}
                  onChange={(e) =>
                    setSettings({ ...settings, green_threshold: Number(e.target.value) })
                  }
                  className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  🟡 대기 하한선 (`yellow_threshold`: 0~100)
                </label>
                <input
                  type="number"
                  value={settings.yellow_threshold ?? 50}
                  onChange={(e) =>
                    setSettings({ ...settings, yellow_threshold: Number(e.target.value) })
                  }
                  className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  근거 점수 하한 (`grounding_min`: 0~100)
                </label>
                <input
                  type="number"
                  value={settings.grounding_min ?? 60}
                  onChange={(e) =>
                    setSettings({ ...settings, grounding_min: Number(e.target.value) })
                  }
                  className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* DND & Briefing */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>방해 금지 시간 (DND) & 브리핑 시각</span>
              </h4>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  일일 브리핑 시각 (`briefing_hour`: 0~23시)
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.briefing_hour ?? 9}
                  onChange={(e) =>
                    setSettings({ ...settings, briefing_hour: Number(e.target.value) })
                  }
                  className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">DND 시작 (`dnd_start`)</label>
                  <input
                    type="text"
                    value={settings.dnd_start ?? '22:00'}
                    onChange={(e) => setSettings({ ...settings, dnd_start: e.target.value })}
                    placeholder="22:00"
                    className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">DND 종료 (`dnd_end`)</label>
                  <input
                    type="text"
                    value={settings.dnd_end ?? '07:00'}
                    onChange={(e) => setSettings({ ...settings, dnd_end: e.target.value })}
                    placeholder="07:00"
                    className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
