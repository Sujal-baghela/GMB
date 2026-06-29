// Core runner proxying requests through our secure backend endpoint
export async function askAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1000
): Promise<string> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessage, maxTokens }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.error === 'AI_KEY_NOT_CONFIGURED') {
      throw new Error('AI_KEY_NOT_CONFIGURED');
    }
    throw new Error(errorData.error || 'AI API error');
  }

  const data = await response.json();
  return data.text;
}

// ============================================================================
// Specific AI helpers used across the app (Unchanged & clean!)
// ============================================================================

export async function generateReviewReply(
  authorName: string,
  rating: number,
  reviewContent: string,
  businessName?: string
): Promise<string> {
  return askAI(
    `You are a professional business owner responding to Google reviews.
Write polite, professional, personalized replies. 
Keep it under 3 sentences. Always thank the reviewer by name.
For negative reviews, be empathetic and offer to resolve the issue.
Do not use generic templates — make it feel genuine.`,
    `Business: ${businessName || 'Our Business'}
Review by ${authorName} (${rating}/5 stars):
"${reviewContent}"

Write a professional reply for this review.`,
    300
  );
}

export async function generateGooglePost(
  businessType: string,
  topic: string,
  postType: 'UPDATE' | 'OFFER' | 'EVENT',
  tone: string = 'friendly and professional'
): Promise<string> {
  return askAI(
    `You are a Google Business Profile content expert.
Write engaging Google Business posts that attract local customers.
Keep posts under 250 words. Always include a clear call to action.
Make it feel authentic and relevant to local customers.`,
    `Business type: ${businessType}
Topic: ${topic}
Post type: ${postType}
Tone: ${tone}

Write an optimized Google Business post.`,
    400
  );
}

export async function improveBusinessDescription(
  businessName: string,
  businessType: string,
  currentDescription: string,
  city: string
): Promise<string> {
  return askAI(
    `You are a local SEO expert helping businesses improve their Google Business profiles.
Write compelling descriptions that rank well in local search and convert visitors to customers.
Keep it under 200 words. Include relevant keywords naturally.`,
    `Business: ${businessName}
Type: ${businessType}
Location: ${city}
Current description: "${currentDescription}"

Rewrite this description to be more compelling and SEO-friendly.`,
    350
  );
}

export async function analyzeSentiment(
  reviewContent: string
): Promise<'positive' | 'neutral' | 'negative'> {
  const result = await askAI(
    `You analyze review sentiment. Reply with ONLY one word: positive, neutral, or negative.`,
    `Review: "${reviewContent}"`,
    10
  );
  const clean = result.trim().toLowerCase();
  if (clean.includes('positive')) return 'positive';
  if (clean.includes('negative')) return 'negative';
  return 'neutral';
}
