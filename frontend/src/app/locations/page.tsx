'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  locationService,
  Location,
  LocationStats,
} from '@/services/locationService';

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-400 text-sm">No rating</span>;
  return (
    <div className="flex items-center gap-1">
      <span className="text-yellow-400 text-sm">
        {'★'.repeat(Math.round(rating))}
      </span>
      <span className="text-gray-600 text-sm font-medium">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function LocationCard({ location }: { location: Location }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            {location.name}
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {[location.address, location.city, location.state, location.country]
              .filter(Boolean)
              .join(', ') || 'No address'}
          </p>
        </div>
        <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
          Active
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <StarRating rating={location.googleRating} />
        <span className="text-gray-400 text-sm">·</span>
        <span className="text-gray-500 text-sm">
          {location.googleReviewCount} reviews
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
        {location.phone && (
          <span className="flex items-center gap-1">📞 {location.phone}</span>
        )}
        {location.website && (
          <a
            href={location.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            🌐 Website
          </a>
        )}
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {location._count.reviews}
          </p>
          <p className="text-xs text-gray-500">Reviews</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {location._count.posts}
          </p>
          <p className="text-xs text-gray-500">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {location._count.photos}
          </p>
          <p className="text-xs text-gray-500">Photos</p>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-gray-400">
            {location.syncedAt
              ? `Synced ${new Date(location.syncedAt).toLocaleDateString()}`
              : 'Never synced'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For now use a hardcoded workspaceId — in production this comes from user context
  const workspaceId =
    typeof window !== 'undefined'
      ? localStorage.getItem('workspaceId') || ''
      : '';

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    if (workspaceId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [workspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [locationsData, statsData] = await Promise.all([
        locationService.getAll(workspaceId),
        locationService.getStats(workspaceId),
      ]);
      setLocations(locationsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const { authUrl } = await locationService.getConnectUrl(workspaceId);
      window.location.href = authUrl;
    } catch (err: any) {
      setError('Failed to get Google authorization URL');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          </div>
          <button
            onClick={handleConnectGoogle}
            disabled={connecting}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Connect Google Business
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!workspaceId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6">
            No workspace selected. Please create an organization first.
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Locations" value={stats.totalLocations} />
            <StatCard
              label="Average Rating"
              value={stats.averageRating > 0 ? `${stats.averageRating} ★` : '—'}
            />
            <StatCard label="Total Reviews" value={stats.totalReviews} />
          </div>
        )}

        {/* Locations list */}
        {locations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">📍</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No locations yet
            </h2>
            <p className="text-gray-500 mb-6">
              Connect your Google Business Profile account to sync your
              locations.
            </p>
            <button
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Connect Google Business Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
