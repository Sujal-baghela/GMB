'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { reviewsService, Review, ReviewStats } from '@/services/reviewsService';
// Fix: Import your newly fortified client-side AI helper
import { generateReviewReply } from '@/lib/aiClient';

function StarDisplay({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'sm' | 'lg';
}) {
  const starSize = size === 'lg' ? 'text-2xl' : 'text-sm';
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${starSize} ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function RatingBar({
  rating,
  count,
  total,
}: {
  rating: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-4">{rating}</span>
      <span className="text-yellow-400 text-sm">★</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="bg-yellow-400 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-gray-500 w-6 text-right">{count}</span>
    </div>
  );
}

// Upgraded with Gemini Smart Suggestions
function ReplyModal({
  review,
  onClose,
  onSubmit,
}: {
  review: Review;
  onClose: () => void;
  onSubmit: (reviewId: string, content: string) => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiDraft = async () => {
    setAiLoading(true);
    try {
      // Pulls historical details automatically to provide deep customization context
      const draft = await generateReviewReply(
        review.authorName,
        review.rating,
        review.content || '',
        review.location?.name
      );
      setContent(draft);
    } catch (err) {
      console.error(err);
      alert(
        'Could not auto-generate response. Please check your AI API configurations.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    await onSubmit(review.id, content);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Reply to Review
          </h2>

          {/* ✨ Dynamic AI Assistant Prompt Trigger */}
          <button
            type="button"
            onClick={handleAiDraft}
            disabled={aiLoading || submitting}
            className="text-xs font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {aiLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-purple-600 border-b-transparent rounded-full animate-spin" />
                Drafting Response...
              </>
            ) : (
              '✨ Draft with AI'
            )}
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-gray-900 text-sm">
              {review.authorName}
            </span>
            <StarDisplay rating={review.rating} />
          </div>
          <p className="text-gray-600 text-sm italic">
            "{review.content || 'No description provided.'}"
          </p>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your reply manually or hit the 'Draft with AI' button above to generate a smart response..."
          rows={5}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || aiLoading || !content.trim()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm"
          >
            {submitting ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  onReply,
}: {
  review: Review;
  onReply: (review: Review) => void;
}) {
  const hasReply = review.replies.some((r) => r.isOwnerReply);
  const statusColors: Record<string, string> = {
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    RESPONDED: 'bg-blue-50 text-blue-700 border-blue-200',
    FLAGGED: 'bg-red-50 text-red-700 border-red-200',
    ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {review.authorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {review.authorName}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {review.location?.name} ·{' '}
              {review.publishedAt
                ? new Date(review.publishedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Unknown date'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusColors[review.status] || 'bg-gray-100 text-gray-500 border-transparent'}`}
          >
            {review.status}
          </span>
        </div>
      </div>

      <StarDisplay rating={review.rating} />

      <p className="text-gray-700 text-sm mt-3 leading-relaxed">
        {review.content ? (
          `"${review.content}"`
        ) : (
          <span className="text-gray-400 italic">
            No text review comment left.
          </span>
        )}
      </p>

      {review.replies.map((reply) => (
        <div
          key={reply.id}
          className="mt-4 ml-4 pl-4 border-l-2 border-blue-200 bg-slate-50/50 p-3 rounded-r-lg"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-600">
              Owner Response
            </span>
            <span className="text-xs text-gray-400">
              {reply.publishedAt
                ? new Date(reply.publishedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : ''}
            </span>
          </div>
          <p className="text-gray-600 text-sm italic">"{reply.content}"</p>
        </div>
      ))}

      {!hasReply && (
        <button
          onClick={() => onReply(review)}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 group transition-colors"
        >
          <span className="transform group-hover:-translate-x-0.5 transition-transform">
            ↩
          </span>{' '}
          Reply to review
        </button>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      const [reviewsData, statsData] = await Promise.all([
        reviewsService.getAll({
          workspaceId,
          rating: ratingFilter,
          status: statusFilter,
          page,
          limit: 10,
        }),
        reviewsService.getStats(workspaceId),
      ]);
      setReviews(reviewsData.reviews);
      setTotalPages(reviewsData.totalPages);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, ratingFilter, statusFilter, page]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loadData]);

  const handleReply = async (reviewId: string, content: string) => {
    try {
      await reviewsService.reply(reviewId, workspaceId, content);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post reply');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
            >
              <span>←</span> Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
            {error}
          </div>
        )}

        {!workspaceId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
            No workspace selected. Please go to Dashboard first.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar — stats */}
          <div className="lg:col-span-1 space-y-4">
            {stats && (
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-1">Average Rating</p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {stats.averageRating || '—'}
                    </span>
                    {stats.averageRating > 0 && (
                      <span className="text-yellow-400 text-2xl mb-1">★</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {stats.total} reviews total
                  </p>
                  <div className="mt-4 space-y-2">
                    {stats.byRating.map((b) => (
                      <RatingBar
                        key={b.rating}
                        rating={b.rating}
                        count={b.count}
                        total={stats.total}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500 mb-3">Response Rate</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.responseRate}%
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${stats.responseRate}%` }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-gray-500">
                    <span>{stats.responded} responded</span>
                    <span>{stats.pending} pending</span>
                  </div>
                </div>
              </>
            )}

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-24">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Filter by Rating
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setRatingFilter(undefined);
                    setPage(1);
                  }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!ratingFilter ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  All ratings
                </button>
                {[5, 4, 3, 2, 1].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRatingFilter(r);
                      setPage(1);
                    }}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${ratingFilter === r ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="text-yellow-400">{'★'.repeat(r)}</span>
                    <span className="text-gray-200">{'★'.repeat(5 - r)}</span>
                  </button>
                ))}
              </div>

              <p className="text-sm font-semibold text-gray-700 mb-3 mt-5">
                Filter by Status
              </p>
              <div className="space-y-1">
                {[undefined, 'APPROVED', 'RESPONDED', 'FLAGGED'].map((s) => (
                  <button
                    key={s || 'all'}
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(1);
                    }}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${statusFilter === s ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {s || 'All statuses'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reviews list */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                <div className="text-5xl mb-4">⭐</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No reviews found
                </h2>
                <p className="text-gray-500 mb-4 text-sm">
                  Try clearing your filters or sync your Google Business
                  locations to see updates.
                </p>
                <button
                  onClick={() => router.push('/locations')}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                >
                  Go to Locations
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onReply={setSelectedReview}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {selectedReview && (
        <ReplyModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onSubmit={handleReply}
        />
      )}
    </div>
  );
}
