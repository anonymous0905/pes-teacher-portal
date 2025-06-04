import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    const res = await fetch(
      'https://api-inference.huggingface.co/models/google/flan-t5-small',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        },
        body: JSON.stringify({ inputs: `Summarize the following text:\n\n${text}` }),
      },
    )

    if (!res.ok) {
      const err = await res.text()
      console.error(err)
      return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
    }

    const data = await res.json()
    const summary = Array.isArray(data) ? data[0]?.generated_text || '' : data?.generated_text || ''
    return NextResponse.json({ summary })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
