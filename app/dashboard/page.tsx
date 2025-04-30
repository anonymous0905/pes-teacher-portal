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

interface LogEntry {
    id: string
    session_id: string
    teacher_id: string
    result: any
    created_at: string
    srn: string
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

    const [showModal, setShowModal] = useState(false)
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

    useEffect(() => {
        async function init() {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) {
                router.push('/')
                return
            }
            setTeacherName(user.user_metadata?.name || 'Teacher')

            const { data: procList } = await supabase
                .from<Procedure>('procedures')
                .select('id, procedure_name, package_name')
            setProcedures(procList || [])

            const { data: sessionList } = await supabase
                .from('sessions')
                .select('id, session_code, srn, created_at, expires_at, is_practice, is_evaluation, procedures(procedure_name, package_name)')
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false })

            const sessionData = sessionList || []
            setSessions(sessionData as SessionWithProcedure[])

            const logs: { [key: string]: boolean } = {}

            for (const s of sessionData) {
                const isExpired = new Date(s.expires_at) <= new Date()
                if (!isExpired) continue

                const { data: sessionRecord, error: sessionErr } = await supabase
                    .from('sessions')
                    .select('id')
                    .eq('session_code', s.session_code)
                    .maybeSingle()

                if (sessionErr || !sessionRecord) {
                    logs[s.session_code] = false
                    continue
                }

                const { data: logData, error: logErr } = await supabase
                    .from('logs')
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

    const handleViewLogs = async (sessionCode: string) => {
        setSelectedLog(null)
        setShowModal(true)

        const { data: sessionRecord } = await supabase
            .from('sessions')
            .select('id')
            .eq('session_code', sessionCode)
            .maybeSingle()

        if (!sessionRecord) {
            setSelectedLog(null)
            return
        }

        const { data: logEntry } = await supabase
            .from('logs')
            .select('*')
            .eq('session_id', sessionRecord.id)
            .maybeSingle()

        if (logEntry) {
            setSelectedLog(logEntry as LogEntry)
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
                            onClick={handleLogout}
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
                                const isExpired = new Date(s.expires_at) <= new Date()
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
                                                    <button
                                                        onClick={() => handleViewLogs(s.session_code)}
                                                        className="text-blue-600 underline text-xs"
                                                    >
                                                        View Logs
                                                    </button>
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 text-black">
                    <div className="bg-white max-w-2xl w-full rounded-lg p-6 shadow-lg relative">
                        <h3 className="text-lg font-semibold mb-4">Session Log</h3>
                        <pre className="bg-gray-100 text-xs p-4 overflow-auto max-h-[400px] rounded whitespace-pre-wrap">
              {selectedLog?.result
                  ? JSON.stringify(selectedLog.result, null, 2)
                  : 'Loading...'}
            </pre>
                        <button
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-sm"
                            onClick={() => {
                                setShowModal(false)
                                setSelectedLog(null)
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
