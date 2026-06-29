'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { photosService, Photo, PhotoStats } from '@/services/photosService';
import apiClient from '@/lib/apiClient';

interface Location {
  id: string;
  name: string;
}

function UploadModal({
  locations,
  workspaceId,
  onClose,
  onUpload,
}: {
  locations: Location[];
  workspaceId: string;
  onClose: () => void;
  onUpload: () => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!preview || !locationId) return;
    setUploading(true);
    try {
      await photosService.create(workspaceId, {
        locationId,
        url: preview,
        thumbnailUrl: preview,
        caption,
      });
      onUpload();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          Upload Photo
        </h2>
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors mb-4"
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto rounded-lg object-cover"
            />
          ) : (
            <div>
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-gray-500 text-sm">Click to select an image</p>
              <p className="text-gray-400 text-xs mt-1">
                JPG, PNG, WebP up to 10MB
              </p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Caption (optional)
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !preview || !locationId}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoCard({
  photo,
  onDelete,
}: {
  photo: Photo;
  onDelete: (id: string) => void;
}) {
  const [showOverlay, setShowOverlay] = useState(false);
  return (
    <div
      className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square cursor-pointer"
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
    >
      <img
        src={photo.thumbnailUrl || photo.url}
        alt={photo.caption || 'Photo'}
        className="w-full h-full object-cover"
      />
      {showOverlay && (
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-3">
          <div className="flex justify-end">
            <button
              onClick={() => onDelete(photo.id)}
              className="bg-red-500 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-600"
            >
              Archive
            </button>
          </div>
          <div>
            {photo.caption && (
              <p className="text-white text-xs truncate">{photo.caption}</p>
            )}
            <p className="text-white/70 text-xs">{photo.location?.name}</p>
          </div>
        </div>
      )}
      <div className="absolute top-2 left-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            photo.status === 'ACTIVE'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {photo.status}
        </span>
      </div>
    </div>
  );
}

export default function PhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | undefined>();

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
      const [photosData, statsData, locationsData] = await Promise.all([
        photosService.getAll(workspaceId, locationFilter),
        photosService.getStats(workspaceId),
        apiClient.get('/api/locations', { params: { workspaceId } }),
      ]);
      setPhotos(photosData);
      setStats(statsData);
      setLocations(locationsData.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, locationFilter]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    try {
      await photosService.delete(id, workspaceId);
      await loadData();
    } catch {
      setError('Failed to archive photo');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Photos</h1>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            disabled={locations.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <span>+</span> Upload Photo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500">Total Photos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalPhotos}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500">Total Views</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalViews}
              </p>
            </div>
          </div>
        )}

        {locations.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setLocationFilter(undefined)}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${!locationFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              All Locations
            </button>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setLocationFilter(loc.id)}
                className={`text-sm px-4 py-2 rounded-lg border transition-colors ${locationFilter === loc.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">🖼️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No photos yet
            </h2>
            <p className="text-gray-500 mb-6">
              {locations.length === 0
                ? 'Connect a Google Business location first.'
                : 'Upload your first photo to get started.'}
            </p>
            {locations.length > 0 ? (
              <button
                onClick={() => setShowUpload(true)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm"
              >
                Upload First Photo
              </button>
            ) : (
              <button
                onClick={() => router.push('/locations')}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm"
              >
                Go to Locations
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          locations={locations}
          workspaceId={workspaceId}
          onClose={() => setShowUpload(false)}
          onUpload={loadData}
        />
      )}
    </div>
  );
}
