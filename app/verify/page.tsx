'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase' // Adjust the import path as per your project structure

export default function VerifySessionPage() {
    const [sessionCode, setSessionCode] = useState('')
    const [response, setResponse] = useState('')
    const [loading, setLoading] = useState(false)

    const handleVerify = async () => {
        setLoading(true)
        setResponse('')

        // 1. Get auth token
        const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        if (sessErr || !token) {
            console.error('Auth session error:', sessErr)
            setResponse('❌ Authentication failed')
            setLoading(false)
            return
        }

        // 2. Make secure request with Bearer token
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-session`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ session_code: sessionCode })
                }
            )

            const data = await res.json()

            if (!res.ok) {
                setResponse(`❌ Error: ${data.error || 'Unknown error'}`)
            } else {
                setResponse(`✅ Success:\n${JSON.stringify(data, null, 2)}`)
            }
        } catch (error: any) {
            setResponse(`❌ Request failed: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="max-w-md mx-auto mt-20 p-4 border rounded shadow space-y-4">
            <h1 className="text-2xl font-bold">Verify Session</h1>

            <input
                type="text"
                placeholder="Enter session code"
                className="w-full p-2 border rounded"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
            />

            <button
                onClick={handleVerify}
                disabled={loading || sessionCode.trim() === ''}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
                {loading ? 'Verifying...' : 'Verify Session'}
            </button>

            {response && (
                <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap text-sm">{response}</pre>
            )}
        </main>
    )
}
