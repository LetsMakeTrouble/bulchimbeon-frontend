import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Loader2, MailOpen } from 'lucide-react';
import type { NotificationItem } from '../types';
import { notificationsApi } from '../api/notifications';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
    } catch (err: any) {
      setError('알림 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            <span>인앱 알림함</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            답변 확정, 정정, 반려 및 DND 브리핑 알림을 확인합니다.
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center space-x-1.5 border border-indigo-500/30 transition"
          >
            <CheckCheck className="w-4 h-4" />
            <span>모두 읽음으로 표시</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>알림 목록을 로드하는 중...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl p-8 space-y-2">
          <MailOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">새로운 알림이 없습니다</h3>
          <p className="text-xs text-slate-500">질문이 답변되거나 카드가 처리되면 여기에 알림이 도착합니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => !item.is_read && handleMarkRead(item.id)}
              className={`p-4 rounded-xl border transition flex items-start justify-between cursor-pointer ${
                item.is_read
                  ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                  : 'bg-slate-900 border-indigo-500/40 shadow-lg'
              }`}
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center space-x-2">
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                  <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>
                <span className="text-[10px] text-slate-500 block pt-1">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              {!item.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkRead(item.id);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
                >
                  읽음
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
