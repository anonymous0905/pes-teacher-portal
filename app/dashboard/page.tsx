// Complete DashboardPage.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import logo from '@/public/cave-logo.png'
import graphBg from '@/public/building-logo.png'
import nav from '@/public/nav-logo.png'
import headerWave from '@/public/header-removebg-preview.png'

const LineChart = dynamic(() => import('./LineChart'), { ssr: false })

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

export default function DashboardPage() {
    const router = useRouter()

    const [teacherName, setTeacherName] = useState('')
    const [srn, setSrn] = useState('')
    const [procedureId, setProcedureId] = useState('')
    const [mode, setMode] = useState<'practice' | 'evaluation'>('practice')
    const [procedures, setProcedures] = useState<Procedure[]>([])
    const [sessions, setSessions] = useState<SessionWithProcedure[]>([])
    const [logAvailability, setLogAvailability] = useState<{ [c: string]: boolean }>({})
    const [status, setStatus] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [selectedLog, setSelectedLog] = useState<LogRow | null>(null)

    useEffect(() => {
        (async () => {
            const { data: { user }, error: userErr } = await supabase.auth.getUser()
            if (userErr || !user) { router.push('/'); return }
            setTeacherName(user.user_metadata?.name ?? 'Teacher')

            const { data: procList } = await supabase.from('procedures').select('id, procedure_name, package_name')
            setProcedures(procList as Procedure[] ?? [])

            const { data: sessionList } = await supabase
                .from('sessions')
                .select(`
          id, session_code, srn, created_at, expires_at,
          is_practice, is_evaluation,
          procedures ( procedure_name, package_name )
        `)
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false })

            const sessionsFlat = (sessionList ?? []).map((s: any) => ({
                ...s,
                procedures: Array.isArray(s.procedures) ? s.procedures[0] : s.procedures
            })) as SessionWithProcedure[]
            setSessions(sessionsFlat.slice(0, 20))

            const logs: { [c: string]: boolean } = {}
            for (const s of sessionsFlat) {
                if (new Date(s.expires_at) > new Date()) continue
                const { data: row } = await supabase
                    .from('logs')
                    .select('id')
                    .eq('session_id', s.id)
                    .maybeSingle()
                logs[s.session_code] = !!row
            }
            setLogAvailability(logs)
        })()
    }, [router])

    const handleViewLogs = async (sessionId: string) => {
        setShowModal(true)
        setSelectedLog(null)
        const { data: logRow, error } = await supabase
            .from('logs')
            .select('result')
            .eq('session_id', sessionId)
            .maybeSingle<LogRow>()
        setSelectedLog(error ? { result: { error: error.message } } : logRow)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleCreateSession = async () => {
        if (!srn || !procedureId) return setStatus('Please enter SRN & choose a procedure');
        setStatus('Creating session...');

        const { data: student, error: studErr } = await supabase
            .from('students')
            .select('*')
            .eq('srn', srn)
            .single();

        if (studErr) {
            const name = prompt('Student not found. Full name:');
            if (!name) return setStatus('Cancelled');
            const email = prompt('Student email:');
            if (!email) return setStatus('Email required');
            const section = prompt('Student Section:');
            if (!section) return setStatus('Section required');
            const semester = prompt('Student Semester:');
            if (!semester) return setStatus('Semester required');
            const { error: insertErr } = await supabase
                .from('students')
                .insert([{ srn, name, email, section, semester }]);
            if (insertErr) return setStatus('Error: ' + insertErr.message);
        }

        const proc = procedures.find(p => p.id === procedureId);
        if (!proc) return setStatus('Invalid procedure selected');

        const payload = {
            package_name: proc.package_name,
            srn,
            is_practice: mode === 'practice',
            is_evaluation: mode === 'evaluation',
        };

        const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (sessErr || !token) return setStatus('Authentication failed');

        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`, // ✅ JWT for create-session
            },
            body: JSON.stringify(payload),
        });

        const result = await res.json();

        if (res.ok) {
            setStatus(`✅ Session created: ${result.session_code}`);

            // ✅ Send session code via email with same token
            const emailRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`, // ✅ JWT for email-session
                },
                body: JSON.stringify({ sessionCode: result.session_code }),
            });

            const emailResult = await emailRes.json();
            if (!emailRes.ok) {
                console.error('Email sending failed:', emailResult);
                setStatus(`⚠️ Session created, but email failed to send.`);
            }

            setSessions(prev => [
                {
                    id: result.id ?? result.session_code,
                    session_code: result.session_code,
                    srn,
                    created_at: new Date().toISOString(),
                    expires_at: result.expires_at,
                    is_practice: payload.is_practice,
                    is_evaluation: payload.is_evaluation,
                    procedures: {
                        procedure_name: proc.procedure_name,
                        package_name: proc.package_name,
                    },
                },
                ...prev.slice(0, 19),
            ]);
        } else {
            console.error('Create-session failed:', result);
            setStatus('❌ ' + result.error);
        }
    };


    return (
        <>
            <style>{`@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}.blink{animation:blink 1s infinite;}`}</style>

            {/* Nav Image fixed to bottom-left */}
            <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />

            <div className="flex min-h-screen text-white bg-[#1a1a1a]">
                {/* Sidebar fixed */}
                <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
                    <div>
                        <Image src={logo} alt="Logo" width={80} height={80} className="mb-8 " />
                        <nav className="space-y-4 text-xl">
                            <button onClick={() => router.push('/dashboard')} className="text-left w-full font-bold underline">Dashboard</button>
                            <button onClick={() => router.push('/sessions')} className="text-left w-full">Sessions</button>
                            <button onClick={() => router.push('/classcreate')} className="text-left w-full">Bulk Creation</button>
                            <button onClick={() => router.push('/analytics')} className="text-left w-full">Analytics</button>
                        </nav>
                        <button onClick={handleLogout} className="text-left text-lg mt-10">Logout</button>
                    </div>
                </aside>

                {/* Main with left padding for fixed sidebar */}
                <main className="flex-1 p-10 space-y-10 relative ml-64">
                    <Image src={headerWave} alt="Header Wave" className="absolute top-0 right-0 w-1/3 opacity-20 pointer-events-none" />
                    <h2 className="text-3xl font-bold">Welcome, {teacherName}</h2>

                    <div className="flex gap-10">
                        <section className="bg-[#2a2a2a] p-6 rounded-2xl w-1/2">
                            <h3 className="text-2xl font-bold mb-4">New Session</h3>
                            <select value={procedureId} onChange={e => setProcedureId(e.target.value)} className="w-full mb-4 p-2 rounded bg-white text-black">
                                <option value="">Select Procedure</option>
                                {procedures.map(p => <option key={p.id} value={p.id}>{p.procedure_name}</option>)}
                            </select>
                            <input value={srn} onChange={e => setSrn(e.target.value)} placeholder="Student SRN" className="w-full mb-4 p-2 rounded bg-white text-black" />
                            <div className="flex gap-6 text-sm mb-4">
                                <label className="flex items-center gap-2">
                                    <input type="radio" value="practice" checked={mode === 'practice'} onChange={() => setMode('practice')} /> Practice
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" value="evaluation" checked={mode === 'evaluation'} onChange={() => setMode('evaluation')} /> Evaluation
                                </label>
                            </div>
                            <button onClick={handleCreateSession} className="w-full py-2 bg-white text-black rounded-full font-bold">Create</button>
                            {status && <p className="text-red-500 text-xs mt-2">{status}</p>}
                        </section>

                        <section className="bg-[#3a3a3a] p-6 rounded-2xl w-1/2 relative">
                            <h3 className="text-2xl font-bold mb-4">Performance</h3>
                            <div className="h-48 rounded overflow-hidden relative">
                                <Image src={graphBg} alt="Graph Background" fill className="object-cover opacity-5" />
                                <div className="absolute inset-0 z-10">
                                    <LineChart />
                                </div>
                            </div>
                        </section>
                    </div>

                    <section className="bg-[#2a2a2a] p-6 rounded-2xl">
                        <h3 className="text-2xl font-bold mb-4">Previous Sessions</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                <tr className="border-b border-gray-600">
                                    <th className="py-2">Session Code</th>
                                    <th>Procedure</th>
                                    <th>SRN</th>
                                    <th>Mode</th>
                                    <th>Expires</th>
                                    <th>Status</th>
                                    <th>Logs</th>
                                </tr>
                                </thead>
                                <tbody>
                                {sessions.map(s => {
                                    const expired = new Date(s.expires_at) <= new Date()
                                    const mode = s.is_practice ? 'Practice' : s.is_evaluation ? 'Evaluation' : '—'
                                    return (
                                        <tr key={s.id} className="border-b border-gray-800">
                                            <td className="py-2">{s.session_code}</td>
                                            <td>{s.procedures.procedure_name}</td>
                                            <td>{s.srn}</td>
                                            <td>{mode}</td>
                                            <td>{new Date(s.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                                            <td className={`blink font-bold ${expired ? 'text-red-500' : 'text-green-500'}`}>{expired ? 'Expired' : 'Active'}</td>
                                            <td>
                                                {expired
                                                    ? logAvailability[s.session_code]
                                                        ? <button onClick={() => handleViewLogs(s.id)} className="underline text-blue-400">View Logs</button>
                                                        : <span className="text-gray-500">No logs exist</span>
                                                    : <span className="text-yellow-500">Pending</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg max-w-2xl w-full relative">
                        <h3 className="text-lg font-bold mb-4">Session Log</h3>
                        <pre className="bg-gray-100 text-xs p-4 max-h-[400px] overflow-auto rounded whitespace-pre-wrap">
                            {selectedLog?.result ? JSON.stringify(selectedLog.result, null, 2) : 'Loading...'}
                        </pre>
                        <button className="absolute top-2 right-3 text-gray-600 hover:text-black" onClick={() => { setShowModal(false); setSelectedLog(null) }}>
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
