'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { askAI } from '@/lib/aiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: string;
}

interface QuickStats {
  locations: number;
  reviews: number;
  posts: number;
  unreadNotifications: number;
  averageRating: number;
  pendingReplies: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';
  if (hour < 12) return `Good morning${name} 🌅`;
  if (hour < 17) return `Good afternoon${name} ☀️`;
  return `Good evening${name} 🌙`;
}

function formatMemberSince(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// ─── AI Summary Card ─────────────────────────────────────────────────────────

function AISummaryCard({
  user,
  stats,
  workspaceId: _workspaceId,
}: {
  user: User;
  stats: QuickStats | null;
  workspaceId: string;
}) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);
  const [attempted, setAttempted] = useState(false); // stops infinite retry loop on failure

  const generateSummary = useCallback(async () => {
    if (!stats || attempted) return;
    setLoading(true);
    setError('');
    try {
      const context = `
Business Dashboard Summary:
- Connected Locations: ${stats.locations}
- Total Reviews: ${stats.reviews}
- Average Rating: ${stats.averageRating > 0 ? stats.averageRating + '/5' : 'No ratings yet'}
- Pending Review Replies: ${stats.pendingReplies}
- Total Posts: ${stats.posts}
- Unread Notifications: ${stats.unreadNotifications}
      `.trim();

      const result = await askAI(
        `You are a helpful Google Business Profile assistant giving a brief daily summary.
Be warm, concise, and actionable. Max 3 sentences.
If there are pending replies or unread notifications, mention them as priority actions.
If no data exists yet, encourage the user to connect their Google Business account.
Never use generic filler phrases.`,
        `Here is the current business data:\n\n${context}\n\nGive me a brief good-${
          new Date().getHours() < 12
            ? 'morning'
            : new Date().getHours() < 17
              ? 'afternoon'
              : 'evening'
        } summary and the single most important action I should take today.`,
        200
      );
      setSummary(result);
      setGenerated(true);
    } catch (err: any) {
      if (err.message === 'AI_KEY_NOT_CONFIGURED') {
        setError(
          'Add GEMINI_API_KEY to frontend/.env.local to enable AI summaries.'
        );
      } else {
        setError('');
        // Silent fail — don't show error for auto-summary
      }
    } finally {
      setLoading(false);
      setAttempted(true); // always mark attempted, success or fail — prevents retry loop
    }
  }, [stats, attempted]);

  // Auto-generate when stats load (runs once per page load, never auto-retries on failure)
  useEffect(() => {
    if (stats && !attempted && !loading) {
      generateSummary();
    }
  }, [stats, attempted, loading, generateSummary]);

  if (!stats) return null;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-8 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">
              AI Daily Briefing
            </span>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
              Gemini
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            {getGreeting(user.firstName)}
          </h2>

          {loading && (
            <div className="flex items-center gap-2 text-blue-200 text-sm">
              <div className="w-4 h-4 border-2 border-blue-300 border-b-transparent rounded-full animate-spin" />
              Generating your daily briefing...
            </div>
          )}

          {error && <p className="text-blue-200 text-sm">{error}</p>}

          {summary && !loading && (
            <p className="text-blue-50 text-sm leading-relaxed">{summary}</p>
          )}

          {!loading && !summary && !error && stats.locations === 0 && (
            <p className="text-blue-100 text-sm leading-relaxed">
              Connect your Google Business account to unlock AI insights, review
              management, and post scheduling.
            </p>
          )}
        </div>

        {/* Regenerate button */}
        {generated && !loading && (
          <button
            onClick={() => {
              setGenerated(false);
              setAttempted(false);
              setSummary('');
            }}
            className="text-blue-300 hover:text-white text-xs transition-colors shrink-0 mt-1"
            title="Regenerate summary"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/20">
        {[
          { label: 'Locations', value: stats.locations, icon: '📍' },
          {
            label: 'Avg Rating',
            value: stats.averageRating > 0 ? `${stats.averageRating}★` : '—',
            icon: '⭐',
          },
          { label: 'Pending Replies', value: stats.pendingReplies, icon: '↩' },
          {
            label: 'Notifications',
            value: stats.unreadNotifications,
            icon: '🔔',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/10 rounded-xl px-3 py-2.5 text-center"
          >
            <div className="text-lg mb-0.5">{s.icon}</div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-blue-200 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    setWorkspaceId(localStorage.getItem('workspaceId') || '');
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      const userRes = await apiClient.get('/api/auth/me');
      setUser(userRes.data);

      const existingWorkspaceId = localStorage.getItem('workspaceId');
      if (existingWorkspaceId) {
        await loadQuickStats(existingWorkspaceId);
        setLoading(false);
        return;
      }

      const orgsRes = await apiClient.get('/api/organizations');
      const orgs = orgsRes.data;

      if (orgs && orgs.length > 0) {
        localStorage.setItem('organizationId', orgs[0].id);
        await createDefaultWorkspace(orgs[0].id);
      } else {
        await createDefaultOrgAndWorkspace(userRes.data);
      }
    } catch (error) {
      console.error('Dashboard init error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuickStats = async (wsId: string) => {
    try {
      const [reviewsRes, postsRes, notifRes] = await Promise.allSettled([
        apiClient.get('/api/reviews/stats', { params: { workspaceId: wsId } }),
        apiClient.get('/api/posts/stats', { params: { workspaceId: wsId } }),
        apiClient.get('/api/notifications'),
      ]);

      const reviewStats =
        reviewsRes.status === 'fulfilled' ? reviewsRes.value.data : null;
      const postStats =
        postsRes.status === 'fulfilled' ? postsRes.value.data : null;
      const notifData =
        notifRes.status === 'fulfilled' ? notifRes.value.data : [];

      // Count locations via reviews workspaceId (locations endpoint needs no extra param)
      let locationCount = 0;
      try {
        const locRes = await apiClient.get('/api/locations', {
          params: { workspaceId: wsId },
        });
        locationCount = Array.isArray(locRes.data) ? locRes.data.length : 0;
      } catch {
        /* silent */
      }

      const unread = Array.isArray(notifData)
        ? notifData.filter((n: any) => n.status === 'UNREAD').length
        : 0;

      setStats({
        locations: locationCount,
        reviews: reviewStats?.total ?? 0,
        posts: postStats?.total ?? 0,
        unreadNotifications: unread,
        averageRating: reviewStats?.averageRating ?? 0,
        pendingReplies: reviewStats?.pending ?? 0,
      });
    } catch {
      // Silent — stats are optional
    }
  };

  const createDefaultWorkspace = async (organizationId: string) => {
    try {
      const wsRes = await apiClient.post('/api/workspaces', {
        organizationId,
        name: 'Default Workspace',
        slug: 'default-' + Date.now(),
      });
      const wsId = wsRes.data.id;
      localStorage.setItem('workspaceId', wsId);
      setWorkspaceId(wsId);
      await loadQuickStats(wsId);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const createDefaultOrgAndWorkspace = async (userData: any) => {
    try {
      setOrgLoading(true);
      const name = userData?.firstName
        ? `${userData.firstName}'s Organization`
        : 'My Organization';
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') +
        '-' +
        Date.now();

      const orgRes = await apiClient.post('/api/organizations', { name, slug });
      const org = orgRes.data;
      localStorage.setItem('organizationId', org.id);

      const wsRes = await apiClient.post('/api/workspaces', {
        organizationId: org.id,
        name: 'Default Workspace',
        slug: 'default-' + Date.now(),
      });
      const wsId = wsRes.data.id;
      localStorage.setItem('workspaceId', wsId);
      setWorkspaceId(wsId);
      await loadQuickStats(wsId);
    } catch (error) {
      console.error('Failed to create org/workspace:', error);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('workspaceId');
    localStorage.removeItem('organizationId');
    router.push('/login');
  };

  const navItems = [
    {
      label: 'Locations',
      href: '/locations',
      icon: '📍',
      desc: 'Connect & manage Google Business locations',
      badge: stats?.locations,
    },
    {
      label: 'Reviews',
      href: '/reviews',
      icon: '⭐',
      desc: 'Monitor and reply to customer reviews',
      badge: stats?.pendingReplies,
      badgeColor: 'bg-yellow-500',
    },
    {
      label: 'Posts',
      href: '/posts',
      icon: '📝',
      desc: 'Create and schedule Google Business posts',
      badge: stats?.posts,
    },
    {
      label: 'Photos',
      href: '/photos',
      icon: '📷',
      desc: 'Upload and manage your business photos',
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: '📊',
      desc: 'Track performance and AI-powered insights',
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: '🔔',
      desc: 'Stay on top of important activity',
      badge: stats?.unreadNotifications,
      badgeColor: 'bg-blue-500',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: '⚙️',
      desc: 'Profile, workspace, and preferences',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            {orgLoading
              ? 'Setting up your workspace...'
              : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold">G</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                GMB Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={() => router.push('/settings')}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── AI Summary Card ─────────────────────────────────────────── */}
        {user && (
          <AISummaryCard user={user} stats={stats} workspaceId={workspaceId} />
        )}

        {/* ── Section header ───────────────────────────────────────────── */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Quick Access</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage your Google Business Profiles from one place.
          </p>
        </div>

        {/* ── Nav grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:shadow-md hover:border-blue-200 transition-all group relative"
            >
              {/* Badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`absolute top-3 right-3 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${item.badgeColor || 'bg-gray-400'}`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {item.label}
              </h3>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                {item.desc}
              </p>
            </button>
          ))}
        </div>

        {/* ── Member since footer ──────────────────────────────────────── */}
        {user?.createdAt && formatMemberSince(user.createdAt) && (
          <p className="text-center text-xs text-gray-400 mt-10">
            Member since {formatMemberSince(user.createdAt)}
          </p>
        )}
      </main>
    </div>
  );
}
