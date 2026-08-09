import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { Question, Citation } from '../types';
import { questionsApi } from '../api/questions';
import { GradeBadge } from '../components/common/GradeBadge';
import { CitationViewerModal } from '../components/common/CitationViewerModal';

export const QuestionDetailPage: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // Feedback state
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    setLoading(true);
    questionsApi
      .getDetail(questionId)
      .then(setQuestion)
      .catch(() => setError('질문 상세 정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [questionId]);

  const handleFeedback = async (rating: 'positive' | 'negative') => {
    if (!question?.answer) return;
    setSendingFeedback(true);
    try {
      await questionsApi.sendFeedback(question.answer.id, rating, feedbackComment);
      setFeedbackSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 space-x-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>질문 정보를 로드하는 중...</span>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-xs text-indigo-400 hover:underline flex items-center space-x-1">
          <ArrowLeft className="w-4 h-4" />
          <span>목록으로 돌아가기</span>
        </Link>
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error || '질문을 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>질문 피드로 돌아가기</span>
      </Link>

      {/* Question Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {question.is_urgent && (
              <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>긴급</span>
              </span>
            )}
            {question.answer && <GradeBadge grade={question.answer.grade} size="lg" />}
            <span className="text-xs text-slate-400">
              상태: <strong className="text-slate-200">{question.status}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setLang('ko')}
              className={`text-xs px-2.5 py-1 rounded font-medium ${
                lang === 'ko' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              KO
            </button>
            <button
              onClick={() => setLang('en')}
              className={`text-xs px-2.5 py-1 rounded font-medium ${
                lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Question Contents */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 block">질문 내용:</span>
          <h2 className="text-lg font-semibold text-white leading-relaxed">
            {lang === 'en' ? question.content_en || question.content_ko : question.content_ko}
          </h2>
        </div>

        {/* Metadata */}
        <div className="text-xs text-slate-500 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span>작성자: {question.asker_name || '팀원'}</span>
          <span>작성시각: {new Date(question.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Answer Detail Card */}
      {question.answer ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <Sparkles className="w-5 h-5" />
              <span>AI 답변 상세 ({question.answer.source === 'reused' ? '공식 Q&A 재사용' : '생성됨'})</span>
            </div>
            <span className="text-xs text-slate-400">
              답변 상태: <strong className="text-indigo-300">{question.answer.state}</strong>
            </span>
          </div>

          <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
            {lang === 'en' ? question.answer.content_en || question.answer.content_ko : question.answer.content_ko}
          </div>

          {question.answer.disclaimer && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              ⚠️ {question.answer.disclaimer}
            </div>
          )}

          {/* Citations Section */}
          {question.answer.citations && question.answer.citations.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>검증된 근거 문서 ({question.answer.citations.length}건)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {question.answer.citations.map((cit, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedCitation(cit)}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition space-y-1"
                  >
                    <div className="text-xs font-semibold text-indigo-300 truncate">
                      {cit.document_title}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-2 italic">
                      "{cit.quote}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Form for Asker */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300">답변 피드백 남기기</h4>
            {feedbackSent ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>피드백이 성공적으로 등록되었습니다. 감사합니다!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="피드백 코멘트 (선택사항)..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleFeedback('positive')}
                    disabled={sendingFeedback}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>유용함 (도움됨)</span>
                  </button>
                  <button
                    onClick={() => handleFeedback('negative')}
                    disabled={sendingFeedback}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>개선 필요 (수정 요청)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">AI 파이프라인에서 답변을 생성 중입니다</h3>
          <p className="text-xs text-slate-400">
            문서 검색 및 스키마 검증 후 등급(🟢/🟡/🔴)에 따라 결과가 게시됩니다.
          </p>
        </div>
      )}

      {/* Citation Modal */}
      <CitationViewerModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};
