'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/* ─────── types ─────── */
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
    procedures: { procedure_name: string; package_name: string }
}
interface LogRow { result: any }

/* ─────── component ─────── */
export default function DashboardPage() {
    const router = useRouter()

    /* form/list state */
    const [teacherName, setTeacherName]         = useState('')
    const [srn, setSrn]                         = useState('')
    const [procedureId, setProcedureId]         = useState('')
    const [mode, setMode]                       = useState<'practice'|'evaluation'>('practice')
    const [procedures, setProcedures]           = useState<Procedure[]>([])
    const [sessions, setSessions]               = useState<SessionWithProcedure[]>([])
    const [logAvailability, setLogAvailability] = useState<{[c:string]:boolean}>({})
    const [status, setStatus]                   = useState('')

    /* popup */
    const [showModal, setShowModal]             = useState(false)
    const [selectedLog, setSelectedLog]         = useState<LogRow|null>(null)

    /* ─────── initial fetches ─────── */
    useEffect(() => {
        (async () => {
            /* 1️⃣ auth guard */
            const { data:{ user }, error:userErr } = await supabase.auth.getUser()
            if (userErr || !user) { router.push('/'); return }
            setTeacherName(user.user_metadata?.name ?? 'Teacher')

            /* 2️⃣ procedures */
            const { data:procList } = await supabase
                .from('procedures')
                .select('id, procedure_name, package_name')
            setProcedures(procList as Procedure[] ?? [])

            /* 3️⃣ sessions */
            const { data:sessionList } = await supabase
                .from('sessions')
                .select(`
          id, session_code, srn, created_at, expires_at,
          is_practice, is_evaluation,
          procedures ( procedure_name, package_name )
        `)
                .eq('teacher_id', user.id)
                .order('created_at', { ascending:false })

            const sessionsFlat = (sessionList??[]).map((s:any)=>({
                ...s,
                procedures: Array.isArray(s.procedures) ? s.procedures[0] : s.procedures
            })) as SessionWithProcedure[]
            setSessions(sessionsFlat)

            /* 4️⃣ log-existence cache (expired only) */
            const logs:{[c:string]:boolean} = {}
            for (const s of sessionsFlat) {
                if (new Date(s.expires_at) > new Date()) continue
                const { data:row } = await supabase
                    .from('logs')
                    .select('id')
                    .eq('session_id', s.id)
                    .maybeSingle()
                logs[s.session_code] = !!row
            }
            setLogAvailability(logs)
        })()
    }, [router])

    /* ─────── popup fetch handler ─────── */
    const handleViewLogs = async (sessionId:string) => {
        setShowModal(true)
        setSelectedLog(null)

        const { data:logRow, error } = await supabase
            .from('logs')
            .select('result')
            .eq('session_id', sessionId)
            .maybeSingle<LogRow>()

        setSelectedLog(error ? { result:{ error:error.message } } : logRow)
    }

    /* ─────── logout ─────── */
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    /* ─────── CREATE-SESSION (original) ─────── */
    const handleCreateSession = async () => {
        if (!srn || !procedureId) {
            setStatus('Please enter SRN & choose a procedure')
            return
        }
        setStatus('Creating session...')

        /* ensure student row */
        const { data:student, error:studErr } = await supabase
            .from('students')
            .select('*')
            .eq('srn', srn)
            .single()

        if (studErr) {
            const name  = prompt('Student not found. Full name:')
            if (!name) return setStatus('Cancelled')
            const email = prompt('Student email:')
            if (!email) return setStatus('Email required')
            const { error:insertErr } = await supabase
                .from('students')
                .insert([{ srn, name, email }])
            if (insertErr) return setStatus('Error: '+insertErr.message)
        }

        /* procedure details */
        const proc = procedures.find(p=>p.id===procedureId)
        if (!proc) { setStatus('Invalid procedure selected'); return }

        /* edge-function payload */
        const payload = {
            package_name: proc.package_name,
            srn,
            is_practice:   mode==='practice',
            is_evaluation: mode==='evaluation'
        }

        /* auth token */
        const { data:sessionData, error:sessErr } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (sessErr || !token) { console.error(sessErr); setStatus('Authentication failed'); return }

        /* call edge function */
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-session`,
            {
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    Authorization:`Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }
        )
        const result = await res.json()

        if (res.ok) {
            setStatus(`✅ Session created: ${result.session_code}`)
            setSessions(prev=>[
                {
                    id: result.id ?? result.session_code,
                    session_code: result.session_code,
                    srn,
                    created_at: new Date().toISOString(),
                    expires_at: result.expires_at,
                    is_practice: payload.is_practice,
                    is_evaluation: payload.is_evaluation,
                    procedures: { procedure_name: proc.procedure_name, package_name: proc.package_name }
                },
                ...prev
            ])
        } else {
            console.error('Create-session failed:', result)
            setStatus('❌ '+result.error)
        }
    }

    /* ─────── JSX ─────── */
    return (
        <>
            <style>{`@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}.blink{animation:blink 1s infinite;}`}</style>

            <div className="min-h-screen bg-white text-gray-900">
                {/* header */}
                <header className="flex items-center justify-between p-4 border-b">
                    <h1 className="text-xl font-semibold">Welcome, {teacherName}</h1>
                    <button onClick={handleLogout} className="text-sm">Sign Out</button>
                </header>

                {/* main */}
                <main className="p-6 max-w-xl mx-auto space-y-8">
                    {/* ░ create-session form ░ */}
                    <section className="space-y-4">
                        <input
                            value={srn}
                            onChange={e=>setSrn(e.target.value)}
                            placeholder="Student SRN"
                            className="w-full border-b border-gray-300 py-2 focus:outline-none"
                        />

                        <select
                            value={procedureId}
                            onChange={e=>setProcedureId(e.target.value)}
                            className="w-full border-b border-gray-300 py-2 bg-transparent focus:outline-none"
                        >
                            <option value="" disabled>Select procedure</option>
                            {procedures.map(p=>(
                                <option key={p.id} value={p.id}>{p.procedure_name}</option>
                            ))}
                        </select>

                        <div className="flex gap-6 text-sm">
                            <label className="flex items-center gap-2">
                                <input type="radio" checked={mode==='practice'} onChange={()=>setMode('practice')} />
                                Practice
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="radio" checked={mode==='evaluation'} onChange={()=>setMode('evaluation')} />
                                Evaluation
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={handleCreateSession}
                            className="w-full py-2 rounded bg-black text-white"
                        >
                            Create Session
                        </button>

                        {status && <p className="text-xs text-red-500">{status}</p>}
                    </section>

                    {/* ░ session list ░ */}
                    <section>
                        <h2 className="text-lg font-medium mb-2">All Sessions</h2>
                        <ul className="divide-y divide-gray-200">
                            {sessions.map(s=>{
                                const expired = new Date(s.expires_at) <= new Date()
                                const sessionType = s.is_practice ? 'Practice' : s.is_evaluation ? 'Evaluation' : '—'
                                return (
                                    <li key={s.id} className="py-3 flex justify-between items-start">
                                        {/* left */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-mono text-sm">{s.session_code}</p>
                                                <span className={`h-2 w-2 rounded-full blink ${expired?'bg-red-600':'bg-green-600'}`} />
                                                <span className={`text-xs font-medium ${expired?'text-red-600':'text-green-600'}`}>
                          {expired?'Expired':'Active'}
                        </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {s.srn} • {s.procedures.procedure_name} • {sessionType}
                                            </p>
                                        </div>

                                        {/* right */}
                                        <div className="text-right text-xs space-y-1">
                                            <p>{new Date(s.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p>
                                            <p>Exp: {new Date(s.expires_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</p>

                                            {expired ? (
                                                logAvailability[s.session_code] ? (
                                                    <button
                                                        className="text-blue-600 underline text-xs"
                                                        onClick={()=>handleViewLogs(s.id)}
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

            {/* ░ modal ░ */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 text-black">
                    <div className="bg-white max-w-2xl w-full rounded-lg p-6 shadow-lg relative">
                        <h3 className="text-lg font-semibold mb-4">Session Log</h3>
                        <pre className="bg-gray-100 text-xs p-4 overflow-auto max-h-[400px] rounded whitespace-pre-wrap">
              {selectedLog?.result
                  ? JSON.stringify(selectedLog.result, null, 2)
                  : 'Loading...'}
            </pre>
                        <button
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-sm"
                            onClick={()=>{ setShowModal(false); setSelectedLog(null) }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
