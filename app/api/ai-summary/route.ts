import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `Analyze the data and create a summary highlighting key trends and important points, keep it short I want to understand things in a glance :\n\n${text}` }],
            },
          ],
        }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      console.error(err)
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
    }

    const data = await res.json()
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return NextResponse.json({ summary })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
