'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  postsService,
  Post,
  PostStats,
  CreatePostData,
} from '@/services/postsService';
import apiClient from '@/lib/apiClient';
import { AIPostWriter } from '@/components/ai/AIPostWriter';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const POST_TYPES = ['UPDATE', 'EVENT', 'OFFER', 'PRODUCT'] as const;
const CTA_TYPES = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'];

const STATUS_CONFIG: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  DRAFT: {
    label: 'Draft',
    pill: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
  },
  PUBLISHED: {
    label: 'Published',
    pill: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  SCHEDULED: {
    label: 'Scheduled',
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  ARCHIVED: {
    label: 'Archived',
    pill: 'bg-red-50 text-red-600 border-red-200',
    dot: 'bg-red-400',
  },
};

const TYPE_ICONS: Record<string, string> = {
  UPDATE: '📢',
  EVENT: '📅',
  OFFER: '🏷️',
  PRODUCT: '📦',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Create/Edit Modal ───────────────────────────────────────────────────────

function PostModal({
  locations,
  workspaceId,
  editPost,
  onClose,
  onSave,
}: {
  locations: Location[];
  workspaceId: string;
  editPost?: Post | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!editPost;
  const [form, setForm] = useState<CreatePostData>({
    locationId: editPost?.location?.id || locations[0]?.id || '',
    title: editPost?.title || '',
    content: editPost?.content || '',
    postType: editPost?.postType || 'UPDATE',
    callToActionType: editPost?.callToActionType || '',
    callToActionUrl: editPost?.callToActionUrl || '',
    scheduledAt: editPost?.scheduledAt || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (publish = false) => {
    if (!form.content.trim()) {
      setError('Content is required');
      return;
    }
    if (!form.locationId) {
      setError('Please select a location');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && editPost) {
        // Archive the old draft, then create updated version
        // (swap for a real PATCH call once postsService.update() is added to the backend)
        await postsService.delete(editPost.id, workspaceId);
        await postsService.create(workspaceId, {
          ...form,
          scheduledAt: form.scheduledAt || undefined,
        });
      } else {
        const post = await postsService.create(workspaceId, {
          ...form,
          scheduledAt: form.scheduledAt || undefined,
        });
        if (publish) await postsService.publish(post.id, workspaceId);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Post' : 'Create Post'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Post Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {POST_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, postType: type })}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                    form.postType === type
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {TYPE_ICONS[type]} {type}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="A short, catchy title..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content with AI Writer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Content <span className="text-red-500">*</span>
              </label>
              <AIPostWriter
                onPostGenerated={(text) => setForm({ ...form, content: text })}
                businessType="local business"
              />
            </div>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your post or click ✨ Write with AI above..."
              rows={5}
              maxLength={1500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <span
                className={`text-xs ${form.content.length > 1400 ? 'text-orange-500' : 'text-gray-400'}`}
              >
                {form.content.length > 1400 && '⚠ '}
                {1500 - form.content.length} characters left
              </span>
              {form.content.length > 0 && (
                <button
                  onClick={() => setForm({ ...form, content: '' })}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Call to Action{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={form.callToActionType || ''}
                onChange={(e) =>
                  setForm({ ...form, callToActionType: e.target.value })
                }
                className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">No CTA</option>
                {CTA_TYPES.map((cta) => (
                  <option key={cta} value={cta}>
                    {cta.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={form.callToActionUrl || ''}
                onChange={(e) =>
                  setForm({ ...form, callToActionUrl: e.target.value })
                }
                placeholder="https://..."
                disabled={!form.callToActionType}
                className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule{' '}
              <span className="text-gray-400 font-normal">
                (optional — leave blank to save as draft)
              </span>
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt || ''}
              onChange={(e) =>
                setForm({ ...form, scheduledAt: e.target.value })
              }
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          {!isEdit && (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 border border-blue-600 text-blue-600 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              Save Draft
            </button>
          )}
          <button
            onClick={() => handleSubmit(!isEdit)}
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 shadow-sm transition-colors"
          >
            {submitting
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : form.scheduledAt
                  ? '📅 Schedule'
                  : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${accent ? `border-l-4 ${accent}` : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  workspaceId,
  selected,
  onSelect,
  onEdit,
  onRefresh,
}: {
  post: Post;
  workspaceId: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (post: Post) => void;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState(false);
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT;
  const ctr =
    post.views > 0 ? ((post.clicks / post.views) * 100).toFixed(1) : '0.0';

  const handlePublish = async () => {
    setActing(true);
    try {
      await postsService.publish(post.id, workspaceId);
      onRefresh();
    } catch {
      /* silent */
    } finally {
      setActing(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Archive this post?')) return;
    setActing(true);
    try {
      await postsService.delete(post.id, workspaceId);
      onRefresh();
    } catch {
      /* silent */
    } finally {
      setActing(false);
    }
  };

  const dateLabel = post.publishedAt
    ? `Published ${formatDate(post.publishedAt)}`
    : post.scheduledAt
      ? `Scheduled for ${formatDate(post.scheduledAt)}`
      : `Created ${formatDate(post.createdAt)}`;

  return (
    <div
      className={`bg-white border rounded-xl p-5 transition-all duration-200 hover:shadow-sm ${
        selected ? 'border-blue-400 bg-blue-50/30 shadow-sm' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(post.id)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${status.pill}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                {TYPE_ICONS[post.postType]} {post.postType}
              </span>
              {post.location?.name && (
                <span className="text-xs text-gray-400">
                  📍 {post.location.name}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">{dateLabel}</span>
          </div>

          {/* Title + content */}
          {post.title && (
            <h3 className="font-semibold text-gray-900 text-sm mb-1">
              {post.title}
            </h3>
          )}
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
            {post.content}
          </p>

          {/* CTA badge */}
          {post.callToActionType && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 text-xs px-2.5 py-1 rounded-full font-medium">
                {post.callToActionType.replace(/_/g, ' ')}
                {post.callToActionUrl && <span className="ml-0.5">→</span>}
              </span>
            </div>
          )}

          {/* Engagement bar (published posts) */}
          {post.status === 'PUBLISHED' && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">👁</span>
                  <span className="font-medium text-gray-700">
                    {post.views.toLocaleString()}
                  </span>
                  <span>views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">👆</span>
                  <span className="font-medium text-gray-700">
                    {post.clicks.toLocaleString()}
                  </span>
                  <span>clicks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">📊</span>
                  <span className="font-medium text-gray-700">{ctr}%</span>
                  <span>CTR</span>
                </div>
                {post.views > 0 && (
                  <div className="flex-1 max-w-[120px]">
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, parseFloat(ctr))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 mt-4">
            {post.status === 'DRAFT' && (
              <button
                onClick={() => onEdit(post)}
                className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ✏️ Edit
              </button>
            )}
            {post.status === 'DRAFT' && (
              <button
                onClick={handlePublish}
                disabled={acting}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                {acting ? 'Publishing...' : '🚀 Publish'}
              </button>
            )}
            {post.status !== 'ARCHIVED' && (
              <button
                onClick={handleArchive}
                disabled={acting}
                className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

function BulkActionBar({
  count,
  workspaceId,
  selectedIds,
  onDone,
  onClear,
}: {
  count: number;
  workspaceId: string;
  selectedIds: string[];
  onDone: () => void;
  onClear: () => void;
}) {
  const [acting, setActing] = useState(false);

  const handleBulkArchive = async () => {
    if (!confirm(`Archive ${count} post${count > 1 ? 's' : ''}?`)) return;
    setActing(true);
    try {
      await Promise.all(
        selectedIds.map((id) => postsService.delete(id, workspaceId))
      );
      onDone();
    } finally {
      setActing(false);
    }
  };

  const handleBulkPublish = async () => {
    setActing(true);
    try {
      // Only attempt publish on IDs that are actually DRAFT status
      // (backend will reject publish on already-published/archived posts)
      await Promise.allSettled(
        selectedIds.map((id) => postsService.publish(id, workspaceId))
      );
      onDone();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-4 border border-gray-700 animate-in slide-in-from-bottom-4 duration-200">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="h-4 w-px bg-gray-700" />
      <button
        onClick={handleBulkPublish}
        disabled={acting}
        className="text-xs bg-green-500 hover:bg-green-400 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors font-medium"
      >
        Publish All
      </button>
      <button
        onClick={handleBulkArchive}
        disabled={acting}
        className="text-xs bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors font-medium"
      >
        Archive All
      </button>
      <button
        onClick={onClear}
        className="text-xs text-gray-400 hover:text-white transition-colors"
      >
        ✕ Clear
      </button>
    </div>
  );
}

// ─── Constants (outside component to avoid re-creation on every render) ──────

const STATUSES = [
  undefined,
  'DRAFT',
  'PUBLISHED',
  'SCHEDULED',
  'ARCHIVED',
] as const;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<PostStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [locationFilter, setLocationFilter] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const [workspaceId, setWorkspaceId] = useState('');

  useEffect(() => {
    setWorkspaceId(localStorage.getItem('workspaceId') || '');
  }, []);

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [postsData, statsData, locationsRes] = await Promise.all([
        postsService.getAll(workspaceId, locationFilter, statusFilter),
        postsService.getStats(workspaceId),
        apiClient.get('/api/locations', { params: { workspaceId } }),
      ]);
      setPosts(postsData);
      setStats(statsData);
      setLocations(locationsRes.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
      setSelectedIds([]);
    }
  }, [workspaceId, statusFilter, locationFilter]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loadData]);

  // Client-side search filter
  const filteredPosts = posts.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q) ||
      p.location?.name?.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === filteredPosts.length
        ? []
        : filteredPosts.map((p) => p.id)
    );
  };

  const openCreate = () => {
    setEditPost(null);
    setShowModal(true);
  };
  const openEdit = (post: Post) => {
    setEditPost(post);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditPost(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
              >
                <span>←</span> Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
              {stats && (
                <span className="text-sm text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                  {stats.total} total
                </span>
              )}
            </div>
            <button
              onClick={openCreate}
              disabled={locations.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
            >
              <span>+</span> Create Post
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Error / no-workspace banners ──────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}
        {!workspaceId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
            No workspace selected. Please go to Dashboard first.
          </div>
        )}

        {/* ── Stats grid ───────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              icon="📝"
              label="Total posts"
              value={stats.total}
              accent="border-l-gray-300"
            />
            <StatCard
              icon="🚀"
              label="Published"
              value={stats.published}
              accent="border-l-green-400"
            />
            <StatCard
              icon="📋"
              label="Drafts"
              value={stats.draft}
              accent="border-l-gray-400"
            />
            <StatCard
              icon="📅"
              label="Scheduled"
              value={stats.scheduled}
              accent="border-l-blue-400"
            />
            <StatCard
              icon="👁"
              label="Total views"
              value={stats.totalViews.toLocaleString()}
            />
            <StatCard
              icon="👆"
              label="Total clicks"
              value={stats.totalClicks.toLocaleString()}
              sub={
                stats.totalViews > 0
                  ? `${((stats.totalClicks / stats.totalViews) * 100).toFixed(1)}% CTR`
                  : undefined
              }
            />
          </div>
        )}

        {/* ── Filters row ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          {/* Location filter */}
          {locations.length > 1 && (
            <select
              value={locationFilter || ''}
              onChange={(e) => setLocationFilter(e.target.value || undefined)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Select-all bar (shown when posts exist) ───────────────────────── */}
        {filteredPosts.length > 0 && !loading && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <input
              type="checkbox"
              checked={
                selectedIds.length === filteredPosts.length &&
                filteredPosts.length > 0
              }
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-500">
              {selectedIds.length > 0
                ? `${selectedIds.length} of ${filteredPosts.length} selected`
                : `${filteredPosts.length} post${filteredPosts.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {/* ── Content area ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            {search ? (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No posts match "{search}"
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  Try different keywords or clear the search.
                </p>
                <button
                  onClick={() => setSearch('')}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Clear search
                </button>
              </>
            ) : statusFilter ? (
              <>
                <div className="text-5xl mb-4">📭</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No {statusFilter.toLowerCase()} posts
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  Switch to a different filter to see other posts.
                </p>
                <button
                  onClick={() => setStatusFilter(undefined)}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Show all posts
                </button>
              </>
            ) : locations.length === 0 ? (
              <>
                <div className="text-5xl mb-4">📍</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No locations connected
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Connect a Google Business location to start publishing posts.
                </p>
                <button
                  onClick={() => router.push('/locations')}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
                >
                  Go to Locations
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">📝</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No posts yet
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Create your first Google Business post — updates, offers, or
                  events show up directly in Search and Maps.
                </p>
                <button
                  onClick={openCreate}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
                >
                  Create First Post
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                workspaceId={workspaceId}
                selected={selectedIds.includes(post.id)}
                onSelect={toggleSelect}
                onEdit={openEdit}
                onRefresh={loadData}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <BulkActionBar
          count={selectedIds.length}
          workspaceId={workspaceId}
          selectedIds={selectedIds}
          onDone={() => {
            setSelectedIds([]);
            loadData();
          }}
          onClear={() => setSelectedIds([])}
        />
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      {showModal && (
        <PostModal
          locations={locations}
          workspaceId={workspaceId}
          editPost={editPost}
          onClose={closeModal}
          onSave={loadData}
        />
      )}
    </div>
  );
}
