import React, { useState } from 'react';
import { X, Send, AlertTriangle, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { questionsApi } from '../../api/questions';

interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionAsked?: () => void;
}

export const AskQuestionModal: React.FC<AskQuestionModalProps> = ({
  isOpen,
  onClose,
  onQuestionAsked,
}) => {
  const { activeProject } = useAuth();
  const [content, setContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !activeProject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      await questionsApi.ask(activeProject.id, content.trim(), isUrgent);
      setContent('');
      setIsUrgent(false);
      onClose();
      onQuestionAsked?.();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || '질문 등록 중 오류가 발생했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">질문 등록</h3>
              <p className="text-xs text-slate-400">
                {activeProject.name} 프로젝트에 질문을 등록합니다. (AI 검증 파이프라인 가동)
              </p>
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
              질문 내용 (한국어 또는 영어)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: Acme API 인증 서버의 Access Token 만료 시간과 자동 갱신 정책은 어떻게 되나요?"
              rows={5}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle
                className={`w-4 h-4 ${isUrgent ? 'text-amber-400' : 'text-slate-500'}`}
              />
              <span className="text-xs font-medium text-slate-300">긴급 질문 지정</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
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
              disabled={submitting || !content.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>접수 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>질문 등록</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
