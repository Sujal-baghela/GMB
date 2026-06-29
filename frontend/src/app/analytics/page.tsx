'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  analyticsService,
  AnalyticsSummary,
  AnalyticsInsight,
} from '@/services/analyticsService';

// ─── Constants ───────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  searches: 'Searches',
  directions: 'Directions',
  websiteClicks: 'Website Clicks',
  phoneClicks: 'Phone Calls',
  photoViews: 'Photo Views',
};

const METRIC_COLORS: Record<string, string> = {
  searches: '#3b82f6',
  directions: '#8b5cf6',
  websiteClicks: '#10b981',
  phoneClicks: '#f59e0b',
  photoViews: '#ef4444',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAnalyticsContext(
  summary: AnalyticsSummary,
  insights: AnalyticsInsight[]
): string {
  return `
Google Business Profile Analytics (Last ${summary.period} days):
- Searches: ${summary.totals.searches}
- Direction Requests: ${summary.totals.directions}
- Website Clicks: ${summary.totals.websiteClicks}
- Phone Calls: ${summary.totals.phoneClicks}
- Photo Views: ${summary.totals.photoViews}
- New Reviews: ${summary.reviewCount}
- Average Rating: ${summary.averageRating}

Month-over-month changes:
${insights
  .map(
    (i) =>
      `- ${METRIC_LABELS[i.metric] || i.metric}: ${i.change > 0 ? '+' : ''}${i.change}% (${i.current} this month vs ${i.previous} last month)`
  )
  .join('\n')}
  `.trim();
}

// Render Gemini's response which may contain bullet points or line breaks
function AIResponseText({ text }: { text: string }) {
  const lines = text.split('\n').filter(Boolean);
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isBullet =
          line.startsWith('- ') ||
          line.startsWith('• ') ||
          line.startsWith('* ');
        const content = isBullet ? line.slice(2) : line;
        return (
          <p
            key={i}
            className={`text-sm text-gray-700 leading-relaxed ${isBullet ? 'flex gap-2' : ''}`}
          >
            {isBullet && (
              <span className="text-blue-400 mt-0.5 shrink-0">•</span>
            )}
            {content}
          </p>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  change,
}: {
  label: string;
  value: number;
  icon: string;
  change?: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {change !== undefined && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              change > 0
                ? 'bg-green-100 text-green-700'
                : change < 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ─── AI Insight Card ──────────────────────────────────────────────────────────

const AI_SYSTEM_PROMPT = `You are an expert Google Business Profile consultant helping small business owners.
Analyze the provided analytics data and give specific, actionable advice.
Use bullet points for clarity. Max 4 bullet points. Always include one concrete action the owner can take today.
Use simple language, avoid jargon. Be encouraging but honest.`;

const DEFAULT_QUESTIONS = [
  'What are my top performing metrics this month?',
  'Where should I focus to improve my business visibility?',
  'How does my performance compare to last month?',
  'What actions can I take to get more website clicks?',
] as const;

function AIInsightCard({
  summary,
  insights,
}: {
  summary: AnalyticsSummary | null;
  insights: AnalyticsInsight[];
}) {
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState('');
  const [weeklyLoaded, setWeeklyLoaded] = useState(false);
  const [weeklyInsight, setWeeklyInsight] = useState('');

  // Auto-generate weekly summary when data loads
  useEffect(() => {
    if (!summary || weeklyLoaded || summary.totals.searches === 0) return;
    const generateWeeklySummary = async () => {
      setAutoLoading(true);
      try {
        const { askAI } = await import('@/lib/aiClient');
        const context = buildAnalyticsContext(summary, insights);
        const result = await askAI(
          AI_SYSTEM_PROMPT,
          `Analytics data:\n\n${context}\n\nQuestion: Give me a brief business health summary and the single most important thing I should do this week.`
        );
        setWeeklyInsight(result);
        setWeeklyLoaded(true);
      } catch {
        // Silent fail — don't show error for auto-summary
        setWeeklyLoaded(true);
      } finally {
        setAutoLoading(false);
      }
    };
    generateWeeklySummary();
  }, [summary, insights, weeklyLoaded]);

  const askQuestion = async (q: string) => {
    if (!summary) return;
    setLoading(true);
    setAsked(true);
    setAiResponse('');
    setError('');
    const context = buildAnalyticsContext(summary, insights);
    try {
      const { askAI } = await import('@/lib/aiClient');
      const response = await askAI(
        AI_SYSTEM_PROMPT,
        `Analytics data:\n\n${context}\n\nQuestion: ${q}`
      );
      setAiResponse(response);
    } catch (err: any) {
      if (err.message === 'AI_KEY_NOT_CONFIGURED') {
        setError(
          'Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local to enable AI features.'
        );
      } else {
        setError('AI analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAsked(false);
    setAiResponse('');
    setQuestion('');
    setError('');
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🤖</span>
        <h2 className="text-lg font-semibold text-gray-900">
          AI Business Insights
        </h2>
        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
          Powered by Gemini
        </span>
      </div>

      {/* Auto weekly summary */}
      {(autoLoading || weeklyInsight) && !asked && (
        <div className="mb-5 bg-white border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
            📋 Weekly Summary
          </p>
          {autoLoading ? (
            <div className="flex items-center gap-2 text-sm text-blue-500">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500" />
              Generating your weekly business summary...
            </div>
          ) : (
            <AIResponseText text={weeklyInsight} />
          )}
        </div>
      )}

      {/* Suggestion buttons — shown before user asks a custom question */}
      {!asked && (
        <>
          <p className="text-sm text-gray-600 mb-3">
            {weeklyInsight
              ? 'Ask a follow-up question:'
              : 'Ask AI to analyze your analytics:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {DEFAULT_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuestion(q);
                  askQuestion(q);
                }}
                disabled={!summary || loading}
                className="text-left text-sm bg-white border border-blue-200 text-blue-700 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Custom question input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && question.trim() && askQuestion(question)
          }
          placeholder="Ask anything about your analytics..."
          className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          disabled={!summary || loading}
        />
        <button
          onClick={() => question.trim() && askQuestion(question)}
          disabled={loading || !question.trim() || !summary}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
          ) : (
            'Ask'
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Analyzing your data...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* AI response */}
      {aiResponse && !loading && (
        <div className="mt-4 bg-white border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
            💡 AI Analysis
          </p>
          <AIResponseText text={aiResponse} />
          <button
            onClick={handleReset}
            className="mt-3 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
          >
            ← Ask another question
          </button>
        </div>
      )}

      {/* No data warning */}
      {!summary && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Connect a Google Business location to enable AI insights
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// Only include keys that actually exist on AnalyticsSummary.totals
const STAT_CARDS = [
  { key: 'searches', label: 'Searches', icon: '🔍' },
  { key: 'directions', label: 'Direction Requests', icon: '📍' },
  { key: 'websiteClicks', label: 'Website Clicks', icon: '🌐' },
  { key: 'phoneClicks', label: 'Phone Calls', icon: '📞' },
  { key: 'photoViews', label: 'Photo Views', icon: '📸' },
] as const;

export default function AnalyticsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);
  const [activeMetrics, setActiveMetrics] = useState([
    'searches',
    'websiteClicks',
    'directions',
  ]);

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
      const [summaryData, insightsData] = await Promise.all([
        analyticsService.getSummary(workspaceId, period),
        analyticsService.getInsights(workspaceId),
      ]);
      setSummary(summaryData);
      setInsights(insightsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, period]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loadData]);

  const toggleMetric = (metric: string) =>
    setActiveMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );

  const getChange = (metric: string) =>
    insights.find((i) => i.metric === metric)?.change;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 transition-colors"
            >
              <span>←</span> Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                  period === d
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Banners ────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}
        {!workspaceId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg shadow-sm">
            No workspace selected. Please go to Dashboard first.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* ── Stat cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {STAT_CARDS.map(({ key, label, icon }) => (
                <StatCard
                  key={key}
                  label={label}
                  icon={icon}
                  value={
                    summary?.totals[key as keyof typeof summary.totals] || 0
                  }
                  change={getChange(key)}
                />
              ))}
            </div>

            {/* ── Reviews summary ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                <span className="text-3xl">⭐</span>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary?.averageRating || '—'}
                  </p>
                  <p className="text-sm text-gray-500">Average Rating</p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                <span className="text-3xl">💬</span>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary?.reviewCount || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    New Reviews ({period}d)
                  </p>
                </div>
              </div>
            </div>

            {/* ── AI Insights card ─────────────────────────────────────── */}
            <AIInsightCard summary={summary} insights={insights} />

            {/* ── Line chart ───────────────────────────────────────────── */}
            {summary && summary.chartData.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Performance Over Time
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(METRIC_LABELS).map((metric) => (
                      <button
                        key={metric}
                        onClick={() => toggleMetric(metric)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                          activeMetrics.includes(metric)
                            ? 'text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                        style={
                          activeMetrics.includes(metric)
                            ? { backgroundColor: METRIC_COLORS[metric] }
                            : {}
                        }
                      >
                        {METRIC_LABELS[metric]}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={summary.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      }
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                        })
                      }
                    />
                    <Legend />
                    {activeMetrics.map((metric) => (
                      <Line
                        key={metric}
                        type="monotone"
                        dataKey={metric}
                        name={METRIC_LABELS[metric]}
                        stroke={METRIC_COLORS[metric]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No analytics data yet
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Sync your Google Business locations to start seeing
                  performance data here.
                </p>
                <button
                  onClick={() => router.push('/locations')}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
                >
                  Go to Locations
                </button>
              </div>
            )}

            {/* ── Bar chart — month comparison ─────────────────────────── */}
            {insights.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  This Month vs Last Month
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={insights.map((i) => ({
                      name: METRIC_LABELS[i.metric] || i.metric,
                      'This Month': i.current,
                      'Last Month': i.previous,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="This Month"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Last Month"
                      fill="#e5e7eb"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
