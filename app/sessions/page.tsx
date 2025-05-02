'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import nav from '@/public/nav-logo.png'
import logo from '@/public/cave-logo.png'
import headerWave from '@/public/header-removebg-preview.png'

interface SessionWithProcedure {
    id: string
    session_code: string
    srn: string
    expires_at: string
    is_practice: boolean
    is_evaluation: boolean
    procedures: {
        procedure_name: string
        package_name: string
    }
}

interface LogRow {
    result: any
}

export default function SessionsPage() {
    const router = useRouter()
    const [semester, setSemester] = useState('')
    const [section, setSection] = useState('')
    const [sections, setSections] = useState<string[]>([])
    const [sessions, setSessions] = useState<SessionWithProcedure[]>([])
    const [students, setStudents] = useState<{ srn: string; name: string }[]>([])
    const [srnFilter, setSrnFilter] = useState('')
    const [nameFilter, setNameFilter] = useState('')
    const [sessionCodeFilter, setSessionCodeFilter] = useState('')
    const [modeFilter, setModeFilter] = useState('all')
    const [procedureFilter, setProcedureFilter] = useState('')
    const [dateFilter, setDateFilter] = useState('')
    const [loading, setLoading] = useState(false)
    const [logData, setLogData] = useState<any | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [logAvailability, setLogAvailability] = useState<{ [key: string]: boolean }>({})

    useEffect(() => {
        if (!semester) {
            setSections([])
            setSection('')
            return
        }

        const fetchSections = async () => {
            const { data, error } = await supabase
                .from('students')
                .select('section')
                .eq('semester', semester)

            if (error) return console.error('Error fetching sections:', error)
            const unique = Array.from(new Set(data.map(d => d.section))).filter(Boolean)
            setSections(unique)
            setSection('')
        }

        fetchSections()
    }, [semester])

    useEffect(() => {
        if (!semester || !section) return

        const fetchSessionsAndStudents = async () => {
            setLoading(true)

            const { data: studentsData, error: studErr } = await supabase
                .from('students')
                .select('srn, name')
                .eq('semester', semester)
                .eq('section', section)

            if (studErr || !studentsData?.length) {
                setSessions([])
                setStudents([])
                setLoading(false)
                return
            }

            const srns = studentsData.map(s => s.srn)
            setStudents(studentsData)

            const { data: sessionData, error: sessErr } = await supabase
                .from('sessions')
                .select(`
          id,
          session_code,
          srn,
          expires_at,
          is_practice,
          is_evaluation,
          procedures (
            procedure_name,
            package_name
          )
        `)
                .in('srn', srns)
                .order('expires_at', { ascending: false })

            if (sessErr || !sessionData) {
                console.error('Failed to fetch sessions:', sessErr)
                setSessions([])
            } else {
                const normalized = sessionData.map((s: any) => ({
                    ...s,
                    procedures: Array.isArray(s.procedures) ? s.procedures[0] : s.procedures
                })) as SessionWithProcedure[]

                setSessions(normalized)

                const logChecks = await Promise.all(
                    normalized.map(async (s: SessionWithProcedure) => {
                        const { data } = await supabase
                            .from('logs')
                            .select('id')
                            .eq('session_id', s.id)
                            .maybeSingle()
                        return [s.id, !!data] as [string, boolean]
                    })
                )

                setLogAvailability(Object.fromEntries(logChecks))
            }

            setLoading(false)
        }

        fetchSessionsAndStudents()
    }, [semester, section])

    const filteredSessions = sessions.filter(s => {
        const student = students.find(stu => stu.srn === s.srn)
        const modeMatch =
            modeFilter === 'all' ||
            (modeFilter === 'practice' && s.is_practice) ||
            (modeFilter === 'evaluation' && s.is_evaluation)

        const procedureMatch = !procedureFilter || s.procedures?.procedure_name?.toLowerCase().includes(procedureFilter.toLowerCase())
        const dateMatch = !dateFilter || new Date(s.expires_at).toISOString().slice(0, 10) === dateFilter

        return (
            (!srnFilter || s.srn.includes(srnFilter)) &&
            (!nameFilter || student?.name.toLowerCase().includes(nameFilter.toLowerCase())) &&
            (!sessionCodeFilter || s.session_code.toLowerCase().includes(sessionCodeFilter.toLowerCase())) &&
            modeMatch &&
            procedureMatch &&
            dateMatch
        )
    })

    const getStatus = (s: SessionWithProcedure) => {
        const now = new Date()
        const expiry = new Date(s.expires_at)
        const hasLog = logAvailability[s.id] ?? false
        if (hasLog) return 'complete'
        if (expiry < now) return 'expired'
        return 'active'
    }

    const handleViewLogs = async (sessionId: string) => {
        setModalOpen(true)
        setLogData(null)
        const { data: logRow, error } = await supabase
            .from('logs')
            .select('result')
            .eq('session_id', sessionId)
            .maybeSingle<LogRow>()
        setLogData(error ? { result: { error: error.message } } : logRow)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <>
            <style>{`@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}.blink{animation:blink 1s infinite;}`}</style>

            <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />

            <div className="flex min-h-screen text-white bg-[#1a1a1a]">
                <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
                    <div>
                        <Image src={logo} alt="Logo" width={80} height={80} className="mb-8" />
                        <nav className="space-y-4 text-xl">
                            <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
                            <button onClick={() => router.push('/sessions')} className="text-left w-full font-bold underline">Sessions</button>
                            <button onClick={() => router.push('/students')} className="text-left w-full">Student Records</button>
                        </nav>
                        <button onClick={handleLogout} className="text-left text-lg mt-10">Logout</button>
                    </div>
                </aside>

                <main className="flex-1 p-10 space-y-10 relative ml-64">
                    <Image src={headerWave} alt="Header Wave" className="absolute top-0 right-0 w-1/3 opacity-20 pointer-events-none" />
                    <h2 className="text-3xl font-bold">Sessions</h2>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                            <label className="block mb-1">Semester</label>
                            <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600">
                                <option value="">Select Semester</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => <option key={sem} value={sem}>{sem}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1">Section</label>
                            <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600" disabled={!sections.length}>
                                <option value="">Select Section</option>
                                {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1">SRN</label>
                            <input value={srnFilter} onChange={(e) => setSrnFilter(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600" placeholder="Enter SRN" />
                        </div>
                        <div>
                            <label className="block mb-1">Name</label>
                            <input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600" placeholder="Enter Name" />
                        </div>
                        <div>
                            <label className="block mb-1">Session Code</label>
                            <input value={sessionCodeFilter} onChange={(e) => setSessionCodeFilter(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600" placeholder="Enter Code" />
                        </div>
                        <div>
                            <label className="block mb-1">Mode</label>
                            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600">
                                <option value="all">All</option>
                                <option value="practice">Practice</option>
                                <option value="evaluation">Evaluation</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1">Procedure</label>
                            <input value={procedureFilter} onChange={(e) => setProcedureFilter(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600" placeholder="Enter procedure" />
                        </div>
                        <div>
                            <label className="block mb-1">Date</label>
                            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full p-2 rounded bg-gray-800 border border-gray-600" />
                        </div>
                    </div>

                    {loading && <p className="text-gray-400">Loading sessions...</p>}

                    {!loading && filteredSessions.length > 0 && (
                        <div className="space-y-4">
                            {filteredSessions.map((s, idx) => {
                                const student = students.find(stu => stu.srn === s.srn)
                                const status = getStatus(s)
                                const statusColor = {
                                    active: 'text-green-400 animate-pulse',
                                    expired: 'text-red-400 animate-pulse',
                                    complete: 'text-blue-400 animate-pulse'
                                }[status]

                                return (
                                    <div key={idx} className="bg-[#2a2a2a] p-4 rounded-lg border border-gray-700">
                                        <p><strong>Session Code:</strong> {s.session_code}</p>
                                        <p><strong>SRN:</strong> {s.srn}</p>
                                        <p><strong>Name:</strong> {student?.name ?? 'Unknown'}</p>
                                        <p><strong>Procedure:</strong> {s.procedures?.procedure_name ?? 'N/A'}</p>
                                        <p><strong>Mode:</strong> {s.is_practice ? 'Practice' : s.is_evaluation ? 'Evaluation' : 'N/A'}</p>
                                        <p><strong>Expires At:</strong> {new Date(s.expires_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                        <p><strong>Status:</strong> <span className={statusColor}>{status.toUpperCase()}</span></p>
                                        {status === 'complete' && (
                                            <button onClick={() => handleViewLogs(s.id)} className="mt-2 px-3 py-1 bg-blue-600 rounded hover:bg-blue-700">View Logs</button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {!loading && !filteredSessions.length && semester && section && (
                        <p className="text-gray-500">No sessions found for the selected filters.</p>
                    )}
                </main>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg max-w-2xl w-full relative">
                        <button onClick={() => setModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-white">✖</button>
                        <h2 className="text-xl font-semibold mb-4">Session Logs</h2>
                        <pre className="bg-gray-100 text-xs p-4 max-h-[400px] overflow-auto rounded whitespace-pre-wrap">
              {JSON.stringify(logData?.result ?? 'No logs available.', null, 2)}
            </pre>
                    </div>
                </div>
            )}
        </>
    )
}
