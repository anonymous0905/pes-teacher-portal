'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Procedure {
    id: string
    procedure_name: string
    package_name: string
}

interface SessionWithProcedure {
    id: string
    session_code: string
    srn: string
    created_at: string
    expires_at: string
    is_practice: boolean
    is_evaluation: boolean
    procedures: {
        procedure_name: string
        package_name: string
    }
}

export default function DashboardPage() {
    const router = useRouter()

    const [teacherName, setTeacherName] = useState<string>('')
    const [srn, setSrn] = useState<string>('')
    const [procedureId, setProcedureId] = useState<string>('')
    const [procedures, setProcedures] = useState<Procedure[]>([])
    const [sessions, setSessions] = useState<SessionWithProcedure[]>([])
    const [logAvailability, setLogAvailability] = useState<{ [key: string]: boolean }>({})
    const [status, setStatus] = useState<string>('')
    const [mode, setMode] = useState<'practice' | 'evaluation'>('practice')

    useEffect(() => {
        async function init() {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) {
                router.push('/')
                return
            }
            setTeacherName(user.user_metadata?.name || 'Teacher')

            const { data: procList } = await supabase
                .from('procedures')
                .select('id, procedure_name, package_name')
            setProcedures((procList as Procedure[]) || [])

            const { data: sessionList } = await supabase
                .from('sessions')
                .select('id, session_code, srn, created_at, expires_at, is_practice, is_evaluation, procedures(procedure_name, package_name)')
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false })

            const sessionData = (sessionList || []).map((s: any) => ({
                ...s,
                procedures: Array.isArray(s.procedures) ? s.procedures[0] : s.procedures
            })) as SessionWithProcedure[]
            setSessions(sessionData)

            const logs: { [key: string]: boolean } = {}
            for (const s of sessionData) {
                const isExpired = new Date(s.expires_at) <= new Date()
                if (!isExpired) continue

                const { data: sessionRecord } = await supabase
                    .from('sessions')
                    .select('id')
                    .eq('session_code', s.session_code)
                    .maybeSingle()

                if (!sessionRecord) {
                    logs[s.session_code] = false
                    continue
                }

                const { data: logData, error: logErr } = await supabase
                    .from('session_logs')
                    .select('id')
                    .eq('session_id', sessionRecord.id)
                    .maybeSingle()

                logs[s.session_code] = !!(logData && !logErr)
            }

            setLogAvailability(logs)
        }

        init()
    }, [router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleCreateSession = async () => {
        if (!srn || !procedureId) {
            setStatus('Please enter SRN & choose a procedure')
            return
        }
        setStatus('Creating session...')

        const { data: student, error: studErr } = await supabase
            .from('students')
            .select('*')
            .eq('srn', srn)
            .single()

        if (studErr) {
            const name = prompt('Student not found. Full name:')
            if (!name) return setStatus('Cancelled')
            const email = prompt('Student email:')
            if (!email) return setStatus('Email required')
            const { error: insertError } = await supabase
                .from('students')
                .insert([{ srn, name, email }])
            if (insertError) return setStatus('Error: ' + insertError.message)
        }

        const selectedProc = procedures.find(p => p.id === procedureId)
        if (!selectedProc) {
            setStatus('Invalid procedure selected')
            return
        }

        const payload = {
            package_name: selectedProc.package_name,
            srn,
            is_practice: mode === 'practice',
            is_evaluation: mode === 'evaluation'
        }

        const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (sessErr || !token) {
            console.error('Auth session error:', sessErr)
            return setStatus('Authentication failed')
        }

        const res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-session`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }
        )

        const result = await res.json()
        if (res.ok) {
            setStatus(`✅ Session created: ${result.session_code}`)
            setSessions(prev => [
                {
                    id: result.id || result.session_code,
                    session_code: result.session_code,
                    srn,
                    created_at: new Date().toISOString(),
                    expires_at: result.expires_at,
                    is_practice: payload.is_practice,
                    is_evaluation: payload.is_evaluation,
                    procedures: {
                        procedure_name: selectedProc.procedure_name,
                        package_name: selectedProc.package_name
                    }
                },
                ...prev
            ])
        } else {
            console.error('Create-session failed:', result)
            setStatus('❌ ' + result.error)
        }
    }

    return (
        <>
            <style>
                {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .blink {
            animation: blink 1s infinite;
          }
        `}
            </style>

            <div className="min-h-screen bg-white text-gray-900">
                <header className="flex items-center justify-between p-4 border-b">
                    <h1 className="text-xl font-semibold">Welcome, {teacherName}</h1>
                    <button onClick={handleLogout} className="text-sm">Sign Out</button>
                </header>

                <main className="p-6 max-w-xl mx-auto space-y-8">
                    <section className="space-y-4">
                        <input
                            value={srn}
                            onChange={e => setSrn(e.target.value)}
                            placeholder="Student SRN"
                            className="w-full border-b border-gray-300 focus:outline-none py-2"
                        />

                        <select
                            value={procedureId}
                            onChange={e => setProcedureId(e.target.value)}
                            className="w-full border-b border-gray-300 focus:outline-none py-2 bg-transparent"
                        >
                            <option value="" disabled>Select procedure</option>
                            {procedures.map(p => (
                                <option key={p.id} value={p.id}>{p.procedure_name}</option>
                            ))}
                        </select>

                        <div className="flex gap-6 text-sm">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={mode === 'practice'}
                                    onChange={() => setMode('practice')}
                                />
                                Practice
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    checked={mode === 'evaluation'}
                                    onChange={() => setMode('evaluation')}
                                />
                                Evaluation
                            </label>
                        </div>

                        <button
                            onClick={handleCreateSession}
                            className="w-full py-2 rounded bg-black text-white"
                        >
                            Create Session
                        </button>

                        {status && <p className="text-xs text-red-500">{status}</p>}
                    </section>

                    <section>
                        <h2 className="text-lg font-medium mb-2">All Sessions</h2>
                        <ul className="divide-y divide-gray-200">
                            {sessions.map(s => {
                                const now = new Date()
                                const isExpired = new Date(s.expires_at) <= now
                                const sessionType = s.is_practice ? 'Practice' : s.is_evaluation ? 'Evaluation' : '—'
                                return (
                                    <li key={s.id} className="py-3 flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-mono text-sm">{s.session_code}</p>
                                                <span className={`h-2 w-2 rounded-full blink ${isExpired ? 'bg-red-600' : 'bg-green-600'}`}></span>
                                                <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {s.srn} • {s.procedures.procedure_name} • {sessionType}
                                            </p>
                                        </div>
                                        <div className="text-right text-xs space-y-1">
                                            <p>{new Date(s.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                            <p>Exp: {new Date(s.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                            {isExpired ? (
                                                logAvailability[s.session_code] ? (
                                                    <button className="text-blue-600 underline text-xs">View Logs</button>
                                                ) : (
                                                    <p className="text-gray-400 text-xs">No logs exist</p>
                                                )
                                            ) : (
                                                <p className="text-yellow-600 text-xs">Pending</p>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                </main>
            </div>
        </>
    )
}
