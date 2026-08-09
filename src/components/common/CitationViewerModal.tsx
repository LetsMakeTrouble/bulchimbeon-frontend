import React, { useEffect, useState } from 'react';
import { X, FileText, Loader2, BookOpen } from 'lucide-react';
import type { Citation } from '../../types';
import { documentsApi } from '../../api/documents';

interface CitationViewerModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationViewerModal: React.FC<CitationViewerModalProps> = ({
  citation,
  onClose,
}) => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!citation) return;
    setLoading(true);
    setError('');

    documentsApi
      .getVersionContent(citation.document_id, citation.document_version_id)
      .then((data) => {
        setContent(data.content);
        setTitle(data.title || citation.document_title);
      })
      .catch(() => {
        setError('문서 내용을 불러오는 중 오류가 발생했습니다.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [citation]);

  if (!citation) return null;

  // Highlight the quote in the content
  const renderHighlightedContent = () => {
    if (!content) return null;
    const quote = citation.quote;
    if (!quote || !content.includes(quote)) {
      return <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans">{content}</pre>;
    }

    const parts = content.split(quote);
    return (
      <div className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <mark className="bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded border border-amber-400/50 font-medium">
                {quote}
              </mark>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {title || citation.document_title}
              </h3>
              {citation.heading_path && (
                <p className="text-xs text-slate-400 mt-0.5">{citation.heading_path}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Citation Highlight Box */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start space-x-2 text-xs text-amber-300">
          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">인용 근거 구절:</span> "{citation.quote}"
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>문서 원문을 가져오는 중...</span>
            </div>
          ) : error ? (
            <div className="text-rose-400 text-sm py-8 text-center">{error}</div>
          ) : (
            renderHighlightedContent()
          )}
        </div>
      </div>
    </div>
  );
};
