import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Loader2,
  FileCode,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { DocumentItem } from '../types';
import { documentsApi } from '../api/documents';

export const DocumentsPage: React.FC = () => {
  const { activeProject } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [autoActivate, setAutoActivate] = useState(true);
  const [cascadeMessage, setCascadeMessage] = useState('');

  const fetchDocuments = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError('');
    try {
      const data = await documentsApi.list(activeProject.id);
      setDocuments(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || '문서 목록을 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeProject?.id]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !activeProject) return;

    setUploading(true);
    setCascadeMessage('');
    setError('');

    try {
      await documentsApi.upload(activeProject.id, file, uploadTitle || undefined, autoActivate);
      setUploadTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || '문서 업로드 중 오류가 발생했습니다.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleActivateVersion = async (documentId: string, versionId: string) => {
    setCascadeMessage('');
    try {
      const res = await documentsApi.activateVersion(documentId, versionId);
      if (res.review_cascade_count > 0) {
        setCascadeMessage(
          `⚠️ 버전 전환으로 인해 이 문서를 근거로 한 확정 답변 ${res.review_cascade_count}건이 재검토 카드로 연쇄 전환되었습니다.`
        );
      }
      await fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '버전 활성화 실패');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;
    try {
      await documentsApi.delete(documentId);
      await fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '문서 삭제 실패');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>지식 베이스 문서 관리</span>
            <span className="text-xs font-normal text-slate-400 bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
              {documents.length}개 문서
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            등록된 문서의 활성 버전 청크가 AI 답변 및 근거 검색의 유일한 원천입니다.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Upload Form Card */}
      {activeProject?.role === 'answerer' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>새 문서 업로드 (MD / TXT / PDF / DOCX)</span>
          </h3>

          {cascadeMessage && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              {cascadeMessage}
            </div>
          )}

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  문서 제목 (선택)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="예: Acme API 파트너 연동 규격서 v2"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  파일 선택
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".md,.txt,.pdf,.docx"
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30 file:cursor-pointer cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoActivate}
                  onChange={(e) => setAutoActivate(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>인제스트 성공 시 자동 활성화 (Auto-activate ready version)</span>
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>인제스트 파이프라인 가동 중...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>문서 업로드 시작</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>문서 목록을 로드하는 중...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl p-8 space-y-2">
          <FileCode className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">등록된 문서가 없습니다</h3>
          <p className="text-xs text-slate-500">
            프로젝트 담당자가 개발 문서나 사양서(MD/TXT/PDF/DOCX)를 업로드하면 AI가 학습을 시작합니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{doc.title}</h3>
                    <p className="text-xs text-slate-400">
                      등록일: {new Date(doc.created_at).toLocaleDateString()} • 활성 버전: v
                      {doc.active_version || '없음'}
                    </p>
                  </div>
                </div>

                {activeProject?.role === 'answerer' && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="문서 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Versions Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
                <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>버전 이력 ({doc.versions?.length || 0}건)</span>
                  </span>
                  <span>상태 & 액션</span>
                </div>

                <div className="divide-y divide-slate-850">
                  {doc.versions?.map((v) => {
                    const isActive = doc.active_version === v.version_no;

                    return (
                      <div
                        key={v.id}
                        className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-900/40 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-semibold text-slate-200">v{v.version_no}</span>
                          {isActive && (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>현재 활성 버전</span>
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            {new Date(v.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          {/* Ingest Status Badge */}
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                              v.ingest_status === 'ready'
                                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                : v.ingest_status === 'processing' || v.ingest_status === 'pending'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                            }`}
                          >
                            {v.ingest_status}
                          </span>

                          {/* Activate Button */}
                          {!isActive &&
                            activeProject?.role === 'answerer' &&
                            v.ingest_status === 'ready' && (
                              <button
                                onClick={() => handleActivateVersion(doc.id, v.id)}
                                className="text-[11px] px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                              >
                                이 버전으로 활성화
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
