// Fully Restored UI with Sidebar, Filters, Table and Modal for Class and Student Analytics
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import nav from '@/public/nav-logo.png'
import logo from '@/public/cave-logo.png'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'

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

export default function ClassAnalyticsPage() {
    const router = useRouter()
    const [semester, setSemester] = useState('')
    const [section, setSection] = useState('')
    const [sections, setSections] = useState<string[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [availableProcedures, setAvailableProcedures] = useState<Procedure[]>([])
    const [selectedProcedureId, setSelectedProcedureId] = useState('')
    const [procedureByStudent, setProcedureByStudent] = useState<{ [srn: string]: string }>({})
    const [showModal, setShowModal] = useState(false)
    const [modalContent, setModalContent] = useState<any>(null)
    const [modalTitle, setModalTitle] = useState('')
    const [isStudentView, setIsStudentView] = useState(false)

    const [teacherName, setTeacherName] = useState('')

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) router.push('/')
            else setTeacherName(user.user_metadata?.name || 'Unknown Teacher')
        })()
    }, [])



    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) router.push('/')
        })()
    }, [router])

    useEffect(() => {
        const fetchProcedures = async () => {
            const { data } = await supabase.from('procedures').select('*')
            if (data) setAvailableProcedures(data)
        }
        fetchProcedures()
    }, [])

    useEffect(() => {
        if (!semester) return setSections([])
        const fetchSections = async () => {
            const { data } = await supabase.from('students').select('section').eq('semester', semester)
            if (data) {
                const unique = Array.from(new Set(data.map(d => d.section)))
                setSections(unique)
            }
        }
        fetchSections()
    }, [semester])

    useEffect(() => {
        if (!semester || !section) return
        const fetchStudents = async () => {
            const { data } = await supabase.from('students').select('srn, name, email').eq('semester', semester).eq('section', section)
            if (data) setStudents(data)
        }
        fetchStudents()
    }, [semester, section])

    const handleClassAnalytics = async () => {
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const procedure = availableProcedures.find(p => p.id === selectedProcedureId)
        if (!procedure || !semester || !section) return alert("Missing inputs")

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/class-analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                semester: parseInt(semester),
                section,
                procedure_name: procedure.procedure_name
            })
        })

        const result = await response.json()
        setModalContent(result)
        setModalTitle(`Class Analytics - ${procedure.procedure_name}`)
        setIsStudentView(false)
        setShowModal(true)
    }

    const handleStudentAnalytics = async (srn: string) => {
        const token = (await supabase.auth.getSession()).data.session?.access_token
        const procedureId = procedureByStudent[srn]
        const procedure = availableProcedures.find(p => p.id === procedureId)
        if (!procedure) return alert("Select procedure first")

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/student-analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ srn, procedure_name: procedure.procedure_name })
        })

        const result = await response.json()
        setModalContent(result)
        setModalTitle(`Analytics - ${srn}`)
        setIsStudentView(true)
        setShowModal(true)
    }

    const renderStudentGraphs = () => {
        if (!modalContent) return null
        const practiceData = modalContent.practice?.scores?.map((score: number, i: number) => ({ session: i + 1, score, time: modalContent.practice.total_times[i] })) || []
        const evaluationData = modalContent.evaluation?.scores?.map((score: number, i: number) => ({ session: i + 1, score, time: modalContent.evaluation.total_times[i] })) || []
        const missedSteps = Array.isArray(modalContent.practice?.top_missed_steps)
            ? modalContent.practice.top_missed_steps.map((s: any) => typeof s === 'string' ? { step: s, count: 1 } : s)
            : []
        return (
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold mb-2">Practice Sessions</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={practiceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="session" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="score" stroke="#8884d8" />
                            <Line type="monotone" dataKey="time" stroke="#82ca9d" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div>
                    <h4 className="font-semibold mb-2">Evaluation Sessions</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={evaluationData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="session" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="score" stroke="#8884d8" />
                            <Line type="monotone" dataKey="time" stroke="#82ca9d" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {missedSteps.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Most Missed Steps</h4>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={missedSteps}>
                                <XAxis dataKey="step" interval={0} angle={-20} textAnchor="end" height={100} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#ff6347" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        )
    }

    const renderClassAnalytics = () => {
        if (!modalContent) return null
        const { practice, evaluation } = modalContent
        return (
            <div className="space-y-6 text-sm">
                <div>
                    <h4 className="font-semibold text-base mb-2">Practice Stats</h4>
                    <ul className="space-y-1">
                        <li><strong>Average Score:</strong> {practice?.average_score ?? 'N/A'}</li>
                        <li><strong>Average Time:</strong> {practice?.average_time_sec?.toFixed(2) ?? 'N/A'} seconds</li>
                        <li><strong>Total Sessions:</strong> {practice?.total_sessions}</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-2">Evaluation Stats</h4>
                    <ul className="space-y-1">
                        <li><strong>Average Score:</strong> {evaluation?.average_score ?? 'N/A'}</li>
                        <li><strong>Average Time:</strong> {evaluation?.average_time_sec?.toFixed(2) ?? 'N/A'} seconds</li>
                        <li><strong>Total Sessions:</strong> {evaluation?.total_sessions}</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-2">Top Missed Steps</h4>
                    <ul className="list-disc list-inside">
                        {(practice?.top_missed_steps ?? []).map((step: any, idx: number) => (
                            <li key={idx}>{step.step} — {step.count} times</li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-base mb-2">Lagging Students</h4>
                    <ul className="list-disc list-inside">
                        {(practice?.lagging_students ?? []).map((s: any, idx: number) => (
                            <li key={idx}>{s.srn} - {s.sessions} sessions, Avg Score: {s.avgScore}, Avg Time: {s.avgTime.toFixed(2)}s</li>
                        ))}
                    </ul>
                </div>
            </div>
        )
    }

    const [emailToSend, setEmailToSend] = useState('')

    const handleDownloadPDF = async () => {
        const content = document.getElementById('analytics-content')
        if (!content) return alert('Content not found')

        const html2pdf = (await import('html2pdf.js')).default
        const cloned = content.cloneNode(true) as HTMLElement
        cloned.style.backgroundColor = '#ffffff'
        cloned.style.color = '#000000'
        cloned.style.padding = '20px'
        cloned.style.width = '800px'

        html2pdf().set({
            margin: 0.5,
            filename: `${modalTitle}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        }).from(cloned).save()
    }


    const handleEmailAnalytics = async () => {
        if (!emailToSend) return alert('Enter a valid email');
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const content = document.getElementById('analytics-content');
        if (!content) return alert('Content not found');

        const html2pdf = (await import('html2pdf.js')).default;

        const cloned = content.cloneNode(true) as HTMLElement;
        cloned.style.backgroundColor = '#ffffff';
        cloned.style.color = '#000000';
        cloned.style.padding = '20px';
        cloned.style.width = '800px';

        const opt = {
            margin: 0.5,
            filename: `${modalTitle}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Generate PDF as Blob
        const blob = await html2pdf().from(cloned).set(opt).outputPdf('blob');
        const base64 = await blobToBase64(blob);

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                email: emailToSend,
                subject: modalTitle,
                pdfBase64: base64,
                filename: `${modalTitle}.pdf`
            }),
        });

        const result = await response.json();
        if (response.ok) alert('Email sent successfully!');
        else alert(`Failed to send email: ${result.error}`);
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };


    return (
        <>
            <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />
            <div className="bg-[#1a1a1a] min-h-screen text-white flex relative">
                <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
                    <div>
                        <Image src={logo} alt="Logo" width={80} height={80} className="mb-8" />
                        <nav className="space-y-4 text-xl">
                            <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
                            <button onClick={() => router.push('/sessions')} className="text-left w-full">Sessions</button>
                            <button onClick={() => router.push('/classcreate')} className="text-left w-full">Bulk Creation</button>
                            <button onClick={() => router.push('/analytics')} className="text-left w-full font-bold underline">Analytics</button>
                        </nav>
                        <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-left text-lg mt-10">Logout</button>
                    </div>
                </aside>
                <div className="flex-1 p-10 space-y-10 relative ml-64">
                    <div className="max-w-5xl mx-auto bg-black rounded-xl shadow-lg p-6">
                        <h1 className="text-2xl font-bold mb-6">Class-wise Analytics</h1>
                        <div className="flex gap-4 mb-4">
                            <input type="text" placeholder="Semester" className="p-2 rounded bg-gray-800 border border-gray-700" value={semester} onChange={(e) => setSemester(e.target.value)} />
                            <select className="p-2 rounded bg-gray-800 border border-gray-700" value={section} onChange={(e) => setSection(e.target.value)}>
                                <option value="">Select Section</option>
                                {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                            </select>
                            <select className="p-2 rounded bg-gray-800 border border-gray-700" value={selectedProcedureId} onChange={(e) => setSelectedProcedureId(e.target.value)}>
                                <option value="">Select Procedure</option>
                                {availableProcedures.map(proc => <option key={proc.id} value={proc.id}>{proc.procedure_name}</option>)}
                            </select>
                            <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white" onClick={handleClassAnalytics}>View Class Analytics</button>
                        </div>
                        <table className="w-full text-sm bg-gray-900 rounded">
                            <thead>
                            <tr className="bg-gray-800">
                                <th className="p-2">Name</th>
                                <th className="p-2">SRN</th>
                                <th className="p-2">Procedure</th>
                                <th className="p-2">Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {students.map(student => (
                                <tr key={student.srn} className="border-t border-gray-700">
                                    <td className="p-2">{student.name}</td>
                                    <td className="p-2">{student.srn}</td>
                                    <td className="p-2">
                                        <select className="bg-gray-800 rounded p-1" value={procedureByStudent[student.srn] || ''} onChange={(e) => setProcedureByStudent(prev => ({ ...prev, [student.srn]: e.target.value }))}>
                                            <option value="">Select</option>
                                            {availableProcedures.map(proc => <option key={proc.id} value={proc.id}>{proc.procedure_name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <button className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700" onClick={() => handleStudentAnalytics(student.srn)}>View Analytics</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <p className="mt-4 text-gray-400">Total students: {students.length}</p>
                    </div>
                </div>
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white text-black p-6 rounded-lg max-w-4xl w-full relative">
                        <h3 className="text-lg font-bold mb-4">{modalTitle}</h3>
                        <div id="analytics-content" className="bg-white text-black p-4 rounded shadow">
                            <div className="mb-4 text-sm">
                                <p><strong>Teacher:</strong> {teacherName}</p>
                                {isStudentView ? (
                                    <p><strong>Student SRN:</strong> {modalTitle.replace('Analytics - ', '')}</p>
                                ) : (
                                    <>
                                        <p><strong>Class:</strong> {semester}</p>
                                        <p><strong>Section:</strong> {section}</p>
                                    </>
                                )}
                            </div>
                            {isStudentView ? renderStudentGraphs() : renderClassAnalytics()}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={handleDownloadPDF} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">Download PDF</button>
                            <input type="email" placeholder="Enter email" value={emailToSend} onChange={(e) => setEmailToSend(e.target.value)} className="border border-gray-400 p-2 rounded text-sm" />
                            <button onClick={handleEmailAnalytics} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Email Report</button>
                        </div>
                        <button className="absolute top-2 right-3 text-gray-600 hover:text-black" onClick={() => { setShowModal(false); setModalContent(null); setEmailToSend('') }}>✕</button>
                    </div>
                </div>
            )}
        </>
    )
}
