'use client';

// AI Post Writer component for Posts page
// Usage: <AIPostWriter onPostGenerated={(text) => setPostContent(text)} businessType="restaurant" />

import { useState } from 'react';
import { generateGooglePost } from '@/lib/aiClient';

interface Props {
  onPostGenerated: (text: string) => void;
  businessType?: string;
}

const POST_TYPES = ['UPDATE', 'OFFER', 'EVENT'] as const;
const TONES = [
  'friendly and professional',
  'exciting and energetic',
  'warm and personal',
  'formal and informative',
];
const TOPIC_SUGGESTIONS = [
  'New menu items available',
  'Special weekend offer',
  'Holiday hours announcement',
  'New service launched',
  'Customer appreciation',
  'Upcoming event',
  'Seasonal promotion',
  'Behind the scenes',
];

export function AIPostWriter({
  onPostGenerated,
  businessType = 'business',
}: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [postType, setPostType] = useState<'UPDATE' | 'OFFER' | 'EVENT'>(
    'UPDATE'
  );
  const [tone, setTone] = useState(TONES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const post = await generateGooglePost(
        businessType,
        topic,
        postType,
        tone
      );
      onPostGenerated(post);
      setOpen(false);
      setTopic('');
    } catch (err: any) {
      if (err.message === 'AI_KEY_NOT_CONFIGURED') {
        setError(
          'Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local to enable AI writing'
        );
      } else {
        setError('Failed to generate post. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
      >
        ✨ Write with AI
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              AI Post Writer
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Tell the AI what to write about and it will create an optimized
              Google Business post.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What should the post be about?
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Weekend special offer — 20% off all meals"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TOPIC_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTopic(s)}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Type
              </label>
              <div className="flex gap-2">
                {POST_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setPostType(t)}
                    className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                      postType === t
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
              >
                {loading ? 'Writing...' : '✨ Generate Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
