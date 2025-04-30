'use client'

import { useState } from 'react'

export default function SubmitLogPage() {
    const [jwt, setJwt] = useState('')
    const [sessionCode, setSessionCode] = useState('')
    const [srn, setSrn] = useState('')
    const [result, setResult] = useState<any>(null)
    const [response, setResponse] = useState('')
    const [loading, setLoading] = useState(false)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const text = await file.text()
            const json = JSON.parse(text)
            setResult(json)
        } catch (err) {
            setResponse(`❌ Failed to parse JSON file: ${err}`)
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        setResponse('')

        if (!result || typeof result !== 'object') {
            setResponse('❌ Result must be a valid JSON object')
            setLoading(false)
            return
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    session_code: sessionCode,
                    srn,
                    result
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setResponse(`❌ Error: ${data.error || 'Unknown error'}`)
            } else {
                setResponse(`✅ Success:\n${JSON.stringify(data, null, 2)}`)
            }
        } catch (err: any) {
            setResponse(`❌ Request failed: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="max-w-xl mx-auto mt-20 p-6 border rounded shadow space-y-4">
            <h1 className="text-2xl font-bold">Submit Log (JWT + JSON)</h1>

            <textarea
                placeholder="JWT token"
                className="w-full p-2 border rounded h-24 font-mono"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
            />

            <input
                type="text"
                placeholder="Session Code"
                className="w-full p-2 border rounded"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
            />

            <input
                type="text"
                placeholder="SRN"
                className="w-full p-2 border rounded"
                value={srn}
                onChange={(e) => setSrn(e.target.value)}
            />

            <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full p-2 border rounded"
            />
            <p className="text-sm text-gray-600">
                Upload a JSON file to populate <code>result</code>
            </p>

            <button
                onClick={handleSubmit}
                disabled={loading || !jwt || !sessionCode || !srn || !result}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
                {loading ? 'Submitting...' : 'Submit Log'}
            </button>

            {result && (
                <pre className="bg-gray-50 text-xs p-2 rounded overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
            )}

            {response && (
                <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap text-sm">{response}</pre>
            )}
        </main>
    )
}
