'use client';

// Drop-in AI Reply Button component
// Usage: <AIReplyButton review={review} onReplyGenerated={(text) => setReplyText(text)} />

import { useState } from 'react';
import { generateReviewReply } from '@/lib/aiClient';

interface Review {
  id: string;
  authorName: string;
  rating: number;
  content: string;
}

interface Props {
  review: Review;
  onReplyGenerated: (text: string) => void;
  businessName?: string;
}

export function AIReplyButton({
  review,
  onReplyGenerated,
  businessName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const reply = await generateReviewReply(
        review.authorName,
        review.rating,
        review.content,
        businessName
      );
      onReplyGenerated(reply);
    } catch (err: any) {
      if (err.message === 'AI_KEY_NOT_CONFIGURED') {
        setError(
          'Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local to enable AI replies'
        );
      } else {
        setError('Failed to generate reply. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-purple-600"></div>
            Generating...
          </>
        ) : (
          <>✨ Generate AI Reply</>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
