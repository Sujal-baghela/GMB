'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  notificationsService,
  Notification,
  NotificationType,
} from '@/services/notificationsService';
import { generateReviewReply } from '@/lib/aiClient';
import apiClient from '@/lib/apiClient';

// ─── Constants ───────────────────────────────────────────────────────────────
// Keys match the real Prisma NotificationType enum exactly

const TYPE_CONFIG: Record<
  NotificationType | 'DEFAULT',
  { icon: string; color: string; bg: string; border: string }
> = {
  REVIEW_RECEIVED: {
    icon: '⭐',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  REVIEW_REPLIED: {
    icon: '↩',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  PHOTO_UPLOADED: {
    icon: '📷',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  POST_PUBLISHED: {
    icon: '🚀',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  ANALYTICS_REPORT: {
    icon: '📊',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  BILLING_ALERT: {
    icon: '💳',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  TEAM_INVITATION: {
    icon: '👥',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  SYSTEM_ALERT: {
    icon: '🔔',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
  DEFAULT: {
    icon: '🔔',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

const FILTER_TABS = [
  { key: undefined, label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'REVIEW_RECEIVED', label: 'Reviews' },
  { key: 'POST_PUBLISHED', label: 'Posts' },
  { key: 'SYSTEM_ALERT', label: 'System' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function getConfig(type: string) {
  return TYPE_CONFIG[type as NotificationType] ?? TYPE_CONFIG.DEFAULT;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`text-sm ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Inline AI Reply Panel (only for REVIEW_RECEIVED) ────────────────────────

function InlineReplyPanel({
  notification,
  workspaceId,
  onReplied,
}: {
  notification: Notification;
  workspaceId: string;
  onReplied: () => void;
}) {
  // `data` comes pre-parsed as an object from the backend (JSON.parse already applied)
  const data = notification.data || {};
  const reviewId = data.reviewId as string | undefined;
  const authorName = (data.authorName as string | undefined) || 'Customer';
  const rating = (data.rating as number | undefined) || 5;
  const reviewText = (data.content as string | undefined) || '';
  const locationName = data.locationName as string | undefined;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiError, setAiError] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replied, setReplied] = useState(false);

  const handleDraftWithAI = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const result = await generateReviewReply(
        authorName,
        rating,
        reviewText,
        locationName
      );
      setDraft(result);
    } catch (err: any) {
      if (err.message === 'AI_KEY_NOT_CONFIGURED') {
        setAiError(
          'Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local to enable AI replies.'
        );
      } else {
        setAiError('Could not generate reply. Try again.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handlePostReply = async () => {
    if (!draft.trim() || !reviewId) return;
    setSubmitting(true);
    setReplyError('');
    try {
      await apiClient.post(
        `/api/reviews/${reviewId}/reply`,
        { content: draft.trim() },
        { params: { workspaceId } }
      );
      setReplied(true);
      onReplied();
    } catch (err: any) {
      setReplyError(
        err?.response?.data?.message || 'Failed to post reply. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (replied) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
        <span>✓</span> Reply posted successfully
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!open && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setOpen(true);
              handleDraftWithAI();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
          >
            ✨ Draft Reply with AI
          </button>
          {reviewId && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ↩ Reply manually
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="mt-2 bg-white border border-yellow-200 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {authorName}
              </span>
              <StarRow rating={rating} />
            </div>
            {reviewText ? (
              <p className="text-xs text-gray-600 italic">"{reviewText}"</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No written review</p>
            )}
          </div>

          {aiLoading ? (
            <div className="flex items-center gap-2 text-sm text-purple-600 py-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-b-transparent rounded-full animate-spin" />
              Drafting your reply with AI...
            </div>
          ) : (
            <>
              {aiError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {aiError}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Your reply
                  </label>
                  <button
                    onClick={handleDraftWithAI}
                    disabled={aiLoading}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    ✨ {draft ? 'Regenerate' : 'Draft with AI'}
                  </button>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write your reply or click ✨ Draft with AI above..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">
                  {draft.length} chars
                </p>
              </div>
            </>
          )}

          {replyError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {replyError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                setDraft('');
                setAiError('');
                setReplyError('');
              }}
              className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePostReply}
              disabled={submitting || aiLoading || !draft.trim() || !reviewId}
              className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
            >
              {submitting ? 'Posting...' : '↩ Post Reply'}
            </button>
          </div>

          {!reviewId && (
            <p className="text-xs text-gray-400 text-center">
              Review ID not found in notification — go to{' '}
              <a href="/reviews" className="text-blue-500 hover:underline">
                Reviews page
              </a>{' '}
              to reply.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  workspaceId,
  onMarkRead,
  onReplied,
}: {
  notification: Notification;
  workspaceId: string;
  onMarkRead: (id: string) => void;
  onReplied: (id: string) => void;
}) {
  const cfg = getConfig(notification.type);
  const isUnread = notification.status === 'UNREAD';
  const isNewReview = notification.type === 'REVIEW_RECEIVED';

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
        isUnread
          ? `${cfg.bg} ${cfg.border} shadow-sm`
          : 'bg-white border-gray-200 hover:shadow-sm'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg border ${
          isUnread ? `${cfg.bg} ${cfg.border}` : 'bg-gray-50 border-gray-100'
        }`}
      >
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`text-sm font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}
            >
              {notification.title}
            </p>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0 mt-0.5">
            {timeAgo(notification.createdAt)}
          </span>
        </div>

        <p
          className={`text-sm mt-0.5 leading-relaxed ${isUnread ? 'text-gray-600' : 'text-gray-500'}`}
        >
          {notification.message}
        </p>

        {isNewReview && (
          <InlineReplyPanel
            notification={notification}
            workspaceId={workspaceId}
            onReplied={() => onReplied(notification.id)}
          />
        )}

        {isUnread && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className={`mt-2 text-xs font-medium ${cfg.color} hover:underline transition-colors`}
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  filter,
  onClear,
}: {
  filter: string | undefined;
  onClear: () => void;
}) {
  if (filter === 'unread') {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          All caught up!
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          No unread notifications right now.
        </p>
        <button
          onClick={onClear}
          className="text-blue-600 text-sm font-medium hover:underline"
        >
          View all notifications
        </button>
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
      <div className="text-5xl mb-4">🔔</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        No notifications yet
      </h2>
      <p className="text-gray-500 text-sm">
        You'll be notified when reviews come in, posts go live, or something
        needs your attention.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(
    undefined
  );

  const [workspaceId, setWorkspaceId] = useState('');

  useEffect(() => {
    setWorkspaceId(localStorage.getItem('workspaceId') || '');
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.getAll();
      setNotifications(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loadData, router]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, status: 'READ' as const, readAt: new Date().toISOString() }
          : n
      )
    );
    try {
      await notificationsService.markAsRead(id);
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, status: 'UNREAD' as const, readAt: null } : n
        )
      );
    }
  };

  const handleReplied = async (id: string) => {
    await handleMarkRead(id);
    await loadData();
  };

  const handleMarkAllRead = async () => {
    if (marking) return;
    setMarking(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: 'READ' as const }))
    );
    try {
      await notificationsService.markAllAsRead(notifications);
    } catch {
      await loadData();
    } finally {
      setMarking(false);
    }
  };

  const stats = notificationsService.getStats(notifications);

  const filtered = notifications.filter((n) => {
    if (!activeFilter) return true;
    if (activeFilter === 'unread') return n.status === 'UNREAD';
    return n.type === activeFilter;
  });

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const today: Notification[] = [];
  const yesterdayArr: Notification[] = [];
  const earlier: Notification[] = [];

  filtered.forEach((n) => {
    const d = new Date(n.createdAt).toDateString();
    if (d === todayStr) today.push(n);
    else if (d === yesterdayStr) yesterdayArr.push(n);
    else earlier.push(n);
  });

  const groups: { label: string; items: Notification[] }[] = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (yesterdayArr.length)
    groups.push({ label: 'Yesterday', items: yesterdayArr });
  if (earlier.length) groups.push({ label: 'Earlier', items: earlier });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
              >
                <span>←</span> Dashboard
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Notifications
                </h1>
                {stats.unread > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {stats.unread > 99 ? '99+' : stats.unread}
                  </span>
                )}
              </div>
            </div>

            {stats.unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={marking}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {marking ? (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-600 border-b-transparent rounded-full animate-spin" />
                    Marking...
                  </>
                ) : (
                  '✓ Mark all as read'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm flex items-center gap-2">
            <span>⚠</span> {error}
            <button
              onClick={loadData}
              className="ml-auto text-red-600 text-xs font-medium hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
            <span>{stats.total} total</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span
              className={stats.unread > 0 ? 'text-blue-600 font-medium' : ''}
            >
              {stats.unread} unread
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>{stats.total - stats.unread} read</span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveFilter(tab.key as string | undefined)}
              className={`text-sm px-4 py-2 rounded-lg border font-medium transition-colors ${
                activeFilter === tab.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.key === 'unread' && stats.unread > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.unread}
                </span>
              )}
              {tab.key === undefined && notifications.length > 0 && (
                <span className="ml-1.5 text-gray-400 text-xs">
                  {notifications.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            filter={activeFilter}
            onClear={() => setActiveFilter(undefined)}
          />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {group.items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      workspaceId={workspaceId}
                      onMarkRead={handleMarkRead}
                      onReplied={handleReplied}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
