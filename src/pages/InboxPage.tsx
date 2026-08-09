import React, { useEffect, useState } from 'react';
import {
  Inbox,
  CheckCircle2,
  Edit3,
  XCircle,
  BookOpen,
  Sparkles,
  Loader2,
  ThumbsUp,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { InboxCard, Citation } from '../types';
import { inboxApi } from '../api/inbox';
import { CitationViewerModal } from '../components/common/CitationViewerModal';

export const InboxPage: React.FC = () => {
  const { activeProject } = useAuth();
  const [cards, setCards] = useState<InboxCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // Edit State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editKo, setEditKo] = useState('');
  const [editEn, setEditEn] = useState('');

  // Reject State
  const [rejectingCardId, setRejectingCardId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchCards = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError('');
    try {
      const data = await inboxApi.getCards(activeProject.id);
      setCards(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || '인박스 카드를 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [activeProject?.id]);

  const handleApprove = async (cardId: string) => {
    setProcessingId(cardId);
    try {
      await inboxApi.approveCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '카드 승인 처리 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveEdit = async (cardId: string) => {
    if (!editKo.trim()) return;
    setProcessingId(cardId);
    try {
      await inboxApi.editAnswer(cardId, editKo.trim(), editEn.trim() || undefined);
      setEditingCardId(null);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '답변 수정 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (cardId: string) => {
    if (!rejectReason.trim()) return;
    setProcessingId(cardId);
    try {
      await inboxApi.rejectCard(cardId, rejectReason.trim());
      setRejectingCardId(null);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '카드 반려 실패');
    } finally {
      setProcessingId(null);
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'yellow':
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            🟡 확인 대기 카드
          </span>
        );
      case 'red':
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            🔴 보류 카드 (근거 부족/충돌)
          </span>
        );
      case 'feedback':
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            💬 팀원 피드백 카드
          </span>
        );
      case 'doc_update':
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            📄 문서 갱신 재검토 카드
          </span>
        );
      case 'green':
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            🟢 자동 즉답 적재 카드
          </span>
        );
      default:
        return (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {reason}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Inbox className="w-6 h-6 text-purple-400" />
            <span>담당자 확인 큐 (Inbox Cards)</span>
            <span className="text-xs font-normal text-slate-400 bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">
              대기 {cards.length}건
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            승인 또는 수정 결과는 질문자에게 전달되고 프로젝트 공식 지식으로 자동 축적됩니다.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>담당자 인박스 큐를 불러오는 중입니다...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl p-8 space-y-2">
          <FileCheck className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">모든 카드가 처리되었습니다!</h3>
          <p className="text-xs text-slate-500">
            확인이 필요한 질문이나 재검토 카드가 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {cards.map((card) => {
            const isEditing = editingCardId === card.id;
            const isRejecting = rejectingCardId === card.id;
            const isProcessing = processingId === card.id;

            return (
              <div
                key={card.id}
                className={`bg-slate-900 border rounded-xl p-6 shadow-xl space-y-4 transition ${
                  card.recommend_approve
                    ? 'border-indigo-500/60 ring-1 ring-indigo-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {card.recommend_approve && (
                      <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center space-x-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>승인 추천 (맞았다 2건 이상)</span>
                      </span>
                    )}
                    {getReasonBadge(card.reason)}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(card.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Question */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400">질문 요약:</span>
                  <p className="text-base font-semibold text-white leading-relaxed">
                    {card.question_summary || card.question_content}
                  </p>
                </div>

                {/* Draft Answer or Missing Info */}
                {card.draft_answer ? (
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI 초안 답변 (Draft):</span>
                    </span>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {card.draft_answer}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                    <span className="font-semibold block">⚠️ 근거 부족 / 보류 사유:</span>
                    <p>{card.missing_info || '등록된 근거 문서에서 명확한 답변을 찾을 수 없습니다.'}</p>
                  </div>
                )}

                {/* Citations */}
                {card.citations && card.citations.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-semibold text-slate-400">참고 근거 문서:</span>
                    <div className="flex flex-wrap gap-2">
                      {card.citations.map((cit, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCitation(cit)}
                          className="text-xs px-2.5 py-1 rounded bg-slate-950 hover:bg-indigo-950 text-indigo-300 border border-indigo-800/50 flex items-center space-x-1.5 transition"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="truncate max-w-[180px]">{cit.document_title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                {isEditing && (
                  <div className="p-4 rounded-lg bg-slate-950 border border-indigo-500/40 space-y-3">
                    <h4 className="text-xs font-semibold text-indigo-300">답변 직접 수정 및 승인</h4>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">한국어 답변 (KO)</label>
                      <textarea
                        value={editKo}
                        onChange={(e) => setEditKo(e.target.value)}
                        rows={4}
                        className="w-full rounded bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">영어 답변 (EN, 선택)</label>
                      <textarea
                        value={editEn}
                        onChange={(e) => setEditEn(e.target.value)}
                        rows={3}
                        className="w-full rounded bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setEditingCardId(null)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleSaveEdit(card.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded shadow transition"
                      >
                        수정 후 승인 확정
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject Form */}
                {isRejecting && (
                  <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/40 space-y-3">
                    <h4 className="text-xs font-semibold text-rose-300">카드 반려 및 사유 입력</h4>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="질문자에게 전달할 반려 사유를 작성하세요..."
                      rows={3}
                      className="w-full rounded bg-slate-900 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
                    />
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setRejectingCardId(null)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleReject(card.id)}
                        disabled={isProcessing || !rejectReason.trim()}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded shadow transition"
                      >
                        반려 처리
                      </button>
                    </div>
                  </div>
                )}

                {/* Card Action Buttons */}
                {!isEditing && !isRejecting && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-3">
                    <button
                      onClick={() => {
                        setRejectingCardId(card.id);
                        setRejectReason('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700 hover:border-rose-500/30"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>반려 (Reject)</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingCardId(card.id);
                        setEditKo(card.draft_answer || '');
                        setEditEn('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700 hover:border-indigo-500/30"
                    >
                      <Edit3 className="w-4 h-4 text-indigo-400" />
                      <span>수정 후 승인</span>
                    </button>

                    <button
                      onClick={() => handleApprove(card.id)}
                      disabled={isProcessing}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition hover:scale-[1.02] active:scale-95"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>원안 승인 (Approve)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Citation Viewer Modal */}
      <CitationViewerModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};
