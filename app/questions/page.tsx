'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import logo from '@/public/cave-logo.png';
import nav from '@/public/nav-logo.png';
import headerWave from '@/public/header-removebg-preview.png';

interface Procedure {
    id: string;
    procedure_name: string;
    package_name: string;
    accept_questions: boolean;
}

interface Question {
    id: string;
    question: string;
    options: string[];
    correct_option: string;
    area?: string;
}

export default function QuestionManagementPage() {
    const router = useRouter();
    const [teacherName, setTeacherName] = useState('');
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQuestionData, setNewQuestionData] = useState<Question>({ id: '', question: '', options: ['', '', '', ''], correct_option: '', area: '' });

    useEffect(() => {
        (async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (!user || error) return router.push('/');
            setTeacherName(user.user_metadata?.name ?? 'Teacher');

            const { data } = await supabase
                .from('procedures')
                .select('*')
                .eq('Accept Questions', true);

            setProcedures(data || []);
        })();
    }, [router]);

    const fetchQuestions = async (pkg: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package_name: pkg })
        });
        const data = await res.json();

        const formatted = (data.questions || []).map((q: any) => ({
            id: q.id,
            question: q.question,
            correct_option: q.correct_answer,
            options: [
                q.option_a ?? '',
                q.option_b ?? '',
                q.option_c ?? '',
                q.option_d ?? ''
            ],
            area: q.area ?? ''
        }));

        setQuestions(formatted);
    };

    const handleEdit = (q: Question) => setEditingQuestion({ ...q, options: q.options || ['', '', '', ''] });

    const handleSave = async () => {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!editingQuestion || !token || !selectedProcedure) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                package_name: selectedProcedure.package_name,
                update: true,
                question_id: editingQuestion.id,
                updates: {
                    question: editingQuestion.question,
                    option_a: editingQuestion.options[0],
                    option_b: editingQuestion.options[1],
                    option_c: editingQuestion.options[2],
                    option_d: editingQuestion.options[3],
                    correct_option: editingQuestion.correct_option,
                    area: editingQuestion.area ?? null
                }
            })
        });

        if (res.ok) {
            setEditingQuestion(null);
            fetchQuestions(selectedProcedure.package_name);
        } else {
            const err = await res.json();
            alert('Update failed: ' + err.error);
        }
    };

    const handleDelete = async () => {
        if (!editingQuestion || !selectedProcedure) return;
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return alert('Unauthorized');

        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                package_name: selectedProcedure.package_name,
                delete: true,
                question_id: editingQuestion.id
            })
        });

        if (res.ok) {
            setEditingQuestion(null);
            fetchQuestions(selectedProcedure.package_name); // refresh list
        } else {
            const err = await res.json();
            alert('Delete failed: ' + err.error);
        }
    };


    const handleAddQuestion = async () => {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!newQuestionData || !token || !selectedProcedure) return;

        const payload = {
            question: newQuestionData.question,
            options: newQuestionData.options,
            correct_option: newQuestionData.correct_option,
            procedure_id: selectedProcedure.id,
            area: newQuestionData.area
        };

        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/add-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setShowAddModal(false);
            setNewQuestionData({ id: '', question: '', options: ['', '', '', ''], correct_option: '', area: '' });
            fetchQuestions(selectedProcedure.package_name);
        } else {
            const err = await res.json();
            alert('Error adding question: ' + err.error);
        }
    };

    return (
        <div className="flex min-h-screen text-white bg-[#1a1a1a]">
            <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />
            <aside className="w-64 bg-black p-6 fixed top-0 left-0 h-full z-30">
                <Image src={logo} alt="Logo" width={80} height={80} className="mb-8" />

                <nav className="space-y-4 text-xl">
                    <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
                    <button onClick={() => router.push('/sessions')} className="text-left w-full">Sessions</button>
                    <button onClick={() => router.push('/classcreate')} className="text-left w-full">Bulk Creation</button>
                    <button onClick={() => router.push('/analytics')} className="text-left w-full">Analytics</button>
                    <button onClick={() => router.push('/questions')}className="text-left w-full bg-gray-200 text-black rounded px-2 py-1">Manage Questions</button>
                </nav>
                <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-left text-lg mt-10">Logout</button>
            </aside>

            <main className="flex-1 p-10 space-y-10 ml-64">
                <Image src={headerWave} alt="Header" className="absolute top-0 right-0 w-1/3 opacity-20 pointer-events-none" />
                <h2 className="text-3xl font-bold">Welcome, {teacherName}</h2>

                <section className="bg-[#2a2a2a] p-6 rounded-2xl">
                    <h3 className="text-2xl font-bold mb-4">Select Procedure</h3>
                    <select
                        value={selectedProcedure?.id ?? ''}
                        onChange={e => {
                            const selected = procedures.find(p => p.id === e.target.value);
                            setSelectedProcedure(selected || null);
                            if (selected) fetchQuestions(selected.package_name);
                        }}
                        className="w-full p-2 rounded bg-white text-black"
                    >
                        <option value="">Select a procedure</option>
                        {procedures.map(proc => (
                            <option key={proc.id} value={proc.id}>{proc.procedure_name}</option>
                        ))}
                    </select>
                </section>

                {selectedProcedure && (
                    <section className="bg-[#2a2a2a] p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-bold">Questions</h3>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="py-1 px-4 bg-white text-black rounded-full font-bold"
                            >
                                Add Question
                            </button>
                        </div>
                        <ul className="space-y-4">
                            {questions.map((q, idx) => (
                                <li key={q.id} className="bg-[#3a3a3a] p-4 rounded-xl">
                                    <div className="font-semibold mb-2">{idx + 1}. {q.question}</div>
                                    <ul className="list-disc pl-6">
                                        {q.options.map((opt, i) => (
                                            <li key={i} className={opt === q.correct_option ? 'text-green-400' : ''}>{opt}</li>
                                        ))}
                                    </ul>
                                    {q.area && <p className="text-sm text-gray-300 mt-2">Area: {q.area}</p>}
                                    <button onClick={() => handleEdit(q)} className="mt-2 bg-yellow-500 text-black px-4 py-1 rounded">Edit</button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Edit Modal */}
                ...
                {/* Edit Modal */}
                {editingQuestion && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white text-black p-6 rounded-2xl w-full max-w-2xl">
                            <h3 className="text-xl font-bold mb-4">Edit Question</h3>
                            <label className="block font-semibold mb-1">Question</label>
                            <input required value={editingQuestion.question} onChange={e => setEditingQuestion({ ...editingQuestion, question: e.target.value })} className="w-full p-2 mb-4 border" />
                            {editingQuestion.options.map((opt, idx) => (
                                <div key={idx} className="mb-2">
                                    <label className="block font-semibold mb-1">Option {String.fromCharCode(65 + idx)}</label>
                                    <input required value={opt} onChange={e => {
                                        const newOpts = [...editingQuestion.options];
                                        newOpts[idx] = e.target.value;
                                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                                    }} className="w-full p-2 border" />
                                </div>
                            ))}
                            <label className="block font-semibold mb-1">Correct Option</label>
                            <select required value={editingQuestion.correct_option} onChange={e => setEditingQuestion({ ...editingQuestion, correct_option: e.target.value })} className="w-full p-2 mb-4 border">
                                <option value="">Select correct answer</option>
                                {editingQuestion.options.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <label className="block font-semibold mb-1">Area</label>
                            <input required value={editingQuestion.area || ''} onChange={e => setEditingQuestion({ ...editingQuestion, area: e.target.value })} className="w-full p-2 mb-4 border" />
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Delete
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 border rounded">Cancel</button>
                                    <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded">Save</button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* Add Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white text-black p-6 rounded-2xl w-full max-w-2xl">
                            <h3 className="text-xl font-bold mb-4">Add New Question</h3>
                            <label className="block font-semibold mb-1">Question</label>
                            <input required value={newQuestionData.question} onChange={e => setNewQuestionData({ ...newQuestionData, question: e.target.value })} className="w-full p-2 mb-4 border" />
                            {newQuestionData.options.map((opt, idx) => (
                                <div key={idx} className="mb-2">
                                    <label className="block font-semibold mb-1">Option {String.fromCharCode(65 + idx)}</label>
                                    <input required value={opt} onChange={e => {
                                        const newOpts = [...newQuestionData.options];
                                        newOpts[idx] = e.target.value;
                                        setNewQuestionData({ ...newQuestionData, options: newOpts });
                                    }} className="w-full p-2 border" />
                                </div>
                            ))}
                            <label className="block font-semibold mb-1">Correct Option</label>
                            <select required value={newQuestionData.correct_option} onChange={e => setNewQuestionData({ ...newQuestionData, correct_option: e.target.value })} className="w-full p-2 mb-4 border">
                                <option value="">Select correct answer</option>
                                {newQuestionData.options.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <label className="block font-semibold mb-1">Area</label>
                            <input required value={newQuestionData.area || ''} onChange={e => setNewQuestionData({ ...newQuestionData, area: e.target.value })} className="w-full p-2 mb-4 border" />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button onClick={handleAddQuestion} className="px-4 py-2 bg-black text-white rounded">Add</button>
                            </div>
                        </div>
                    </div>
                )}


            </main>
        </div>
    );
}
