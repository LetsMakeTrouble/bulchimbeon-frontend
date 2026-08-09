import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  BookOpen,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Question, Grade, Citation } from '../types';
import { questionsApi } from '../api/questions';
import { GradeBadge } from '../components/common/GradeBadge';
import { CitationViewerModal } from '../components/common/CitationViewerModal';

export const QuestionsListPage: React.FC = () => {
  const { activeProject } = useAuth();
  const { refreshTrigger } = useOutletContext<{ refreshTrigger: number }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterGrade, setFilterGrade] = useState<Grade | 'all'>('all');
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const fetchQuestions = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError('');
    try {
      const data = await questionsApi.list(activeProject.id);
      setQuestions(data.items);
    } catch (err: any) {
      setError('질문 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [activeProject?.id, refreshTrigger]);

  const filteredQuestions = questions.filter((q) => {
    if (filterGrade === 'all') return true;
    return q.answer?.grade === filterGrade;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>질문 피드 및 답변 이력</span>
            <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              총 {questions.length}건
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {activeProject ? activeProject.name : '프로젝트를 선택하세요'}
          </p>
        </div>

        {/* Controls: Grade Filter & Language Toggle */}
        <div className="flex items-center space-x-3">
          {/* Grade Filter */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setFilterGrade('all')}
              className={`text-xs px-2.5 py-1 rounded-md transition ${
                filterGrade === 'all'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilterGrade('green')}
              className={`text-xs px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                filterGrade === 'green'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🟢 즉답</span>
            </button>
            <button
              onClick={() => setFilterGrade('yellow')}
              className={`text-xs px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                filterGrade === 'yellow'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🟡 대기</span>
            </button>
            <button
              onClick={() => setFilterGrade('red')}
              className={`text-xs px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                filterGrade === 'red'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🔴 보류</span>
            </button>
          </div>

          {/* KO/EN Language Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setLang('ko')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                lang === 'ko'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              KO
            </button>
            <button
              onClick={() => setLang('en')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                lang === 'en'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>질문 목록을 로드하고 있습니다...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl p-8">
          <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">등록된 질문이 없습니다</h3>
          <p className="text-xs text-slate-500 mt-1">
            우측 상단의 '+ 질문 등록' 버튼을 눌러 첫 번째 질문을 남겨보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const answerContent =
              lang === 'en' ? q.answer?.content_en : q.answer?.content_ko;
            const questionContent =
              lang === 'en' ? q.content_en || q.content_ko : q.content_ko;

            return (
              <div
                key={q.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-lg transition space-y-4"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      {q.is_urgent && (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>긴급</span>
                        </span>
                      )}
                      {q.answer && <GradeBadge grade={q.answer.grade} />}
                      <span className="text-xs text-slate-400">
                        {q.asker_name || '팀원'} • {new Date(q.created_at).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white leading-relaxed">
                      {questionContent}
                    </h3>
                  </div>

                  <Link
                    to={`/questions/${q.id}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                    title="상세 타임라인 보기"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>

                {/* Answer Box */}
                {q.answer ? (
                  <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-850 space-y-3">
                    <div className="text-xs font-semibold text-indigo-400 flex items-center justify-between">
                      <span className="flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI 답변 ({q.answer.source === 'reused' ? '공식 Q&A 재사용' : '문서 근거 생성'})</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Status: {q.answer.state}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {answerContent || q.answer.content_ko}
                    </p>

                    {/* Disclaimer */}
                    {q.answer.disclaimer && (
                      <p className="text-xs text-amber-400/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                        ⚠️ {q.answer.disclaimer}
                      </p>
                    )}

                    {/* Citations List */}
                    {q.answer.citations && q.answer.citations.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          인용 근거 문서 ({q.answer.citations.length}건):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {q.answer.citations.map((cit, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedCitation(cit)}
                              className="text-xs px-2.5 py-1 rounded bg-slate-900 hover:bg-indigo-950 text-indigo-300 border border-indigo-800/50 flex items-center space-x-1.5 transition text-left"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="font-medium truncate max-w-[180px]">
                                {cit.document_title}
                              </span>
                              <span className="text-[10px] text-indigo-400/70">
                                "{cit.quote.slice(0, 15)}..."
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>AI 파이프라인에서 근거를 검색 및 검증하는 중입니다...</span>
                  </div>
                )}
              </div>
            );
          })}
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
