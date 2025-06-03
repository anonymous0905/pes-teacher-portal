'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import nav from '@/public/nav-logo.png'
import logo from '@/public/cave-logo.png'
import headerWave from '@/public/header-removebg-preview.png'



interface Student {
    srn: string
    name: string
    email: string
}

interface Procedure {
    id: string
    procedure_name: string
    package_name: string
}

export default function SessionsPage() {
    const router = useRouter()
    const [semester, setSemester] = useState('')
    const [section, setSection] = useState('')
    const [sections, setSections] = useState<string[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [availableProcedures, setAvailableProcedures] = useState<Procedure[]>([])
    const [selectedProcedureId, setSelectedProcedureId] = useState('')
    const [studentCodes, setStudentCodes] = useState<{ [srn: string]: string }>({})
    const [loading, setLoading] = useState(false)
    const [creatingBulk, setCreatingBulk] = useState(false)
    const [status, setStatus] = useState('')
    const [mode, setMode] = useState<'practice' | 'evaluation'>('practice')

    useEffect(() => {
        (async () => {
            const { data: { user }, error: userErr } = await supabase.auth.getUser()
            if (userErr || !user) { router.push('/'); return }
        })()
    }, [router])

    useEffect(() => {
        const fetchProcedures = async () => {
            const { data, error } = await supabase.from('procedures').select('id, procedure_name, package_name')
            if (data && !error) setAvailableProcedures(data)
        }
        fetchProcedures()
    }, [])

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
        }

        fetchSections()
    }, [semester])

    useEffect(() => {
        if (!semester || !section) return

        const fetchStudents = async () => {
            setLoading(true)

            const { data: studentData, error: studentErr } = await supabase
                .from('students')
                .select('srn, name, email')
                .eq('semester', semester)
                .eq('section', section)

            if (studentErr || !studentData) {
                setStudents([])
                setLoading(false)
                return
            }

            setStudents(studentData)
            setLoading(false)
        }

        fetchStudents()
    }, [semester, section])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleBulkCreate = async () => {
        if (!selectedProcedureId) return alert('Please select a procedure')

        setCreatingBulk(true)
        setStatus('Creating sessions and sending emails...')

        const procedure = availableProcedures.find(p => p.id === selectedProcedureId)
        const token = (await supabase.auth.getSession()).data.session?.access_token

        for (const student of students) {
            try {
                const payload = {
                    srn: student.srn,
                    package_name: procedure?.package_name || '',
                    is_practice: mode === 'practice',
                    is_evaluation: mode === 'evaluation',
                }

                const createRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                })

                const session = await createRes.json()

                const emailRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ sessionCode: session.session_code })
                })

                if (emailRes.ok) {
                    setStudentCodes(prev => ({ ...prev, [student.srn]: session.session_code }))
                } else {
                    console.warn(`Email failed for ${student.srn}`)
                }

            } catch (err) {
                console.error(`Failed for SRN ${student.srn}:`, err)
            }
        }

        setCreatingBulk(false)
        setStatus('✅ All sessions created and emailed!')
    }

    return (
        <>
            <style>{`@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}.blink{animation:blink 1s infinite;}`}</style>

            <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />

        <div className="bg-[#1a1a1a] min-h-screen text-white flex relative">

            {/* Static sidebar */}
            <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
                <div>
                    <Image src={logo} alt="Logo" width={80} height={80} className="mb-8 " />
                    <nav className="space-y-4 text-xl">
                        <button onClick={() => router.push('/dashboard')} className="text-left w-full ">Dashboard</button>
                        <button onClick={() => router.push('/sessions')} className="text-left w-full">Sessions</button>
                        <button onClick={() => router.push('/classcreate')} className="text-left w-full bg-gray-200 text-black rounded px-1 py-1">Bulk Creation</button>
                        <button onClick={() => router.push('/analytics')} className="text-left w-full">Analytics</button>
                        <button onClick={() => router.push('/questions')}className="text-left w-full">Manage Questions</button>
                    </nav>
                    <button onClick={handleLogout} className="text-left text-lg mt-10">Logout</button>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 p-10 space-y-10 relative ml-64">

                <Image src={headerWave} alt="Header Wave" className="absolute top-0 right-0 w-1/3 opacity-20 pointer-events-none" />

                <div className="max-w-5xl mx-auto bg-black rounded-xl shadow-lg p-6">
                    <h1 className="text-2xl font-bold mb-4">Bulk Session Creation</h1>

                    <div className="flex gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Semester"
                            className="p-2 rounded bg-gray-800 border border-gray-700 w-1/3"
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                        />
                        <select
                            className="p-2 rounded bg-gray-800 border border-gray-700 w-1/3"
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                        >
                            <option value="">Select Section</option>
                            {sections.map(sec => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>
                        <select
                            className="p-2 rounded bg-gray-800 border border-gray-700 w-1/3"
                            value={selectedProcedureId}
                            onChange={(e) => setSelectedProcedureId(e.target.value)}
                        >
                            <option value="">Select Procedure</option>
                            {availableProcedures.map(proc => (
                                <option key={proc.id} value={proc.id}>{proc.procedure_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-6 mb-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="practice"
                                checked={mode === 'practice'}
                                onChange={() => setMode('practice')}
                                className="accent-green-600"
                            />
                            Practice
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                value="evaluation"
                                checked={mode === 'evaluation'}
                                onChange={() => setMode('evaluation')}
                                className="accent-blue-600"
                            />
                            Evaluation
                        </label>
                    </div>

                    <button
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white mb-6"
                        onClick={handleBulkCreate}
                        disabled={creatingBulk || students.length === 0}
                    >
                        {creatingBulk ? 'Creating...' : 'Create Bulk Sessions'}
                    </button>

                    {status && <p className="mb-4 text-yellow-400">{status}</p>}

                    <table className="w-full text-left text-sm bg-gray-900 rounded">
                        <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="p-2">Name</th>
                            <th className="p-2">SRN</th>
                            <th className="p-2">Session Code</th>
                        </tr>
                        </thead>
                        <tbody>
                        {students.map((student) => (
                            <tr key={student.srn} className="border-t border-gray-700">
                                <td className="p-2">{student.name}</td>
                                <td className="p-2">{student.srn}</td>
                                <td className="p-2 text-green-400">{studentCodes[student.srn] || '—'}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <p className="mt-4 text-gray-400">Total students: {students.length}</p>
                </div>
            </div>
        </div>
            </>
    )
}
