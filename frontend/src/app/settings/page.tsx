'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface TabProps {
  id: string;
  label: string;
  icon: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS: TabProps[] = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'workspace', label: 'Workspace', icon: '🏢' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function SuccessBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
      <span>✓</span>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-green-200 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({
  user,
  onSuccess,
}: {
  user: User;
  onSuccess: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isDirty =
    form.firstName !== (user.firstName || '') ||
    form.lastName !== (user.lastName || '') ||
    form.phone !== (user.phone || '');

  const handleSave = async () => {
    if (!form.firstName.trim()) {
      setError('First name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.patch(`/api/users/${user.id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || null,
        phone: form.phone.trim() || null,
      });
      onSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Personal Information"
        desc="Update your name and contact details."
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Avatar placeholder */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
              {(user.firstName?.[0] || user.email[0]).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {user.firstName
                  ? `${user.firstName} ${user.lastName || ''}`.trim()
                  : user.email}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Member since{' '}
                {new Date(user.createdAt).toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="First Name"
              value={form.firstName}
              onChange={(v) => setForm({ ...form, firstName: v })}
              placeholder="John"
            />
            <InputField
              label="Last Name"
              value={form.lastName}
              onChange={(v) => setForm({ ...form, lastName: v })}
              placeholder="Doe"
            />
          </div>

          <InputField
            label="Email Address"
            value={user.email}
            onChange={() => {}}
            type="email"
            disabled
            hint="Email cannot be changed. Contact support if needed."
          />

          <InputField
            label="Phone Number"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            type="tel"
            placeholder="+91 98765 43210"
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 shadow-sm transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-b-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Account Status">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Account Active</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Your account is in good standing
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              user.isActive
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-400'}`}
            />
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Workspace Tab ────────────────────────────────────────────────────────────

// Replace the entire WorkspaceTab function in frontend/src/app/settings/page.tsx
// with this version — removes the failing GET /api/workspaces/:id call

function WorkspaceTab({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const workspaceId =
    typeof window !== 'undefined'
      ? localStorage.getItem('workspaceId') || ''
      : '';
  const organizationId =
    typeof window !== 'undefined'
      ? localStorage.getItem('organizationId') || ''
      : '';

  const [wsName, setWsName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // No API call needed — workspaceId is already in localStorage
  // Workspace name is editable locally; extend when GET /api/workspaces/:id is added to backend

  const handleSave = async () => {
    if (!wsName.trim()) {
      setError('Workspace name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Store name locally until backend has PATCH /api/workspaces/:id
      localStorage.setItem('workspaceName', wsName.trim());
      await new Promise((r) => setTimeout(r, 300)); // simulate save
      onSuccess('Workspace name saved locally');
    } catch (err: any) {
      setError('Failed to save workspace name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Workspace Details"
        desc="Your current workspace information."
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <InputField
            label="Workspace Name"
            value={wsName}
            onChange={setWsName}
            placeholder="My Workspace"
            hint="Saved locally. Full backend sync coming soon."
          />

          <InputField
            label="Workspace ID"
            value={workspaceId}
            onChange={() => {}}
            disabled
            hint="Used internally. Cannot be changed."
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !wsName.trim()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 shadow-sm transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-b-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Organization" desc="Your organization details.">
        <div className="space-y-4">
          <InputField
            label="Organization ID"
            value={organizationId}
            onChange={() => {}}
            disabled
            hint="Contact support to rename your organization."
          />
        </div>
      </SectionCard>
    </div>
  );
}
// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [prefs, setPrefs] = useState({
    newReview: true,
    reviewReplied: true,
    postPublished: true,
    postScheduled: false,
    photoUploaded: false,
    billingUpdated: true,
    systemAlerts: true,
    emailDigest: false,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    // Preferences stored locally for now — extend to backend when preference model is added
    localStorage.setItem('notifPrefs', JSON.stringify(prefs));
    await new Promise((r) => setTimeout(r, 400)); // simulate save
    setSaving(false);
    onSuccess('Notification preferences saved');
  };

  const rows: { key: keyof typeof prefs; label: string; desc: string }[] = [
    {
      key: 'newReview',
      label: 'New Reviews',
      desc: 'When a customer leaves a new review',
    },
    {
      key: 'reviewReplied',
      label: 'Review Replies',
      desc: 'When a review reply is posted',
    },
    {
      key: 'postPublished',
      label: 'Post Published',
      desc: 'When a Google Business post goes live',
    },
    {
      key: 'postScheduled',
      label: 'Post Scheduled',
      desc: 'When a post is queued for scheduling',
    },
    {
      key: 'photoUploaded',
      label: 'Photo Uploads',
      desc: 'When new photos are added to your profile',
    },
    {
      key: 'billingUpdated',
      label: 'Billing Alerts',
      desc: 'Payment receipts and subscription changes',
    },
    {
      key: 'systemAlerts',
      label: 'System Alerts',
      desc: 'Maintenance, outages, and important updates',
    },
    {
      key: 'emailDigest',
      label: 'Weekly Email Digest',
      desc: 'A weekly summary sent to your email',
    },
  ];

  return (
    <div className="space-y-5">
      <SectionCard
        title="Notification Preferences"
        desc="Choose what you want to be notified about."
      >
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div key={row.key}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {row.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{row.desc}</p>
                </div>
                <button
                  onClick={() => toggle(row.key)}
                  className={`relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                    prefs[row.key] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      prefs[row.key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {i < rows.length - 1 && <div className="h-px bg-gray-100" />}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 shadow-sm transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-b-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Danger Zone Tab ──────────────────────────────────────────────────────────

function DangerTab({ user }: { user: User }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutAll = async () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/users/${user.id}`);
      localStorage.clear();
      router.push('/login');
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Session Management">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Sign out everywhere
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Clears all local session data and returns you to login
            </p>
          </div>
          <button
            onClick={handleLogoutAll}
            className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Delete Account">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-700 mb-1">
              ⚠ This action is permanent
            </p>
            <p className="text-xs text-red-600">
              Deleting your account removes all your data including locations,
              reviews, posts, and photos. This cannot be undone.
            </p>
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium"
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Type{' '}
                <span className="font-mono font-bold text-red-600">DELETE</span>{' '}
                to confirm:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== 'DELETE' || deleting}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [successMsg, setSuccessMsg] = useState('');

  const loadUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/auth/me');
      setUser(res.data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadUser();
  }, [loadUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success toast */}
      {successMsg && (
        <SuccessBanner message={successMsg} onClose={() => setSuccessMsg('')} />
      )}

      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
            >
              <span>←</span> Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <span className="text-sm text-gray-400">{user.email}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar tabs ───────────────────────────────────────────── */}
          <aside className="lg:w-52 shrink-0">
            <nav className="space-y-1 bg-white border border-gray-200 rounded-xl p-2 shadow-sm lg:sticky lg:top-24">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Tab content ────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {activeTab === 'profile' && (
              <ProfileTab user={user} onSuccess={setSuccessMsg} />
            )}
            {activeTab === 'workspace' && (
              <WorkspaceTab onSuccess={setSuccessMsg} />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab onSuccess={setSuccessMsg} />
            )}
            {activeTab === 'danger' && <DangerTab user={user} />}
          </main>
        </div>
      </div>
    </div>
  );
}
