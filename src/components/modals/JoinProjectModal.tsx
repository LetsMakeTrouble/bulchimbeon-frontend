import React, { useState } from 'react';
import { X, UserCheck, Loader2, AlertTriangle } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { useAuth } from '../../context/AuthContext';

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinProjectModal: React.FC<JoinProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { refreshMe } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      await projectsApi.joinByInvite(inviteCode.trim());
      await refreshMe();
      setInviteCode('');
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || '초대 코드 참여 중 오류가 발생했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">초대 코드로 참여</h3>
              <p className="text-xs text-slate-400">질문자(Asker) 역할로 프로젝트에 참여합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              초대 코드
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="예: INV-8F92A"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-slate-200 uppercase tracking-widest placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || !inviteCode.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/30 flex items-center space-x-1.5 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>참여 중...</span>
                </>
              ) : (
                <span>프로젝트 참여</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
