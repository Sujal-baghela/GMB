import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI_KEY_NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    const { systemPrompt, userMessage, maxTokens } = await req.json();

    // Fix: Using the correct camelCase 'systemInstruction' endpoint schema
    const response = await fetch(
         `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens || 1000,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Gemini Upstream Error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ text: textOutput });
  } catch (err: any) {
    console.error('Internal Server AI Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
