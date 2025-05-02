'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SemesterSectionSelector() {
    const [semester, setSemester] = useState('')
    const [sections, setSections] = useState<string[]>([])
    const [selectedSection, setSelectedSection] = useState('')
    const [loadingSections, setLoadingSections] = useState(false)

    // Fetch distinct sections when semester is selected
    useEffect(() => {
        if (!semester) {
            setSections([])
            setSelectedSection('')
            return
        }

        const fetchSections = async () => {
            setLoadingSections(true)
            const { data, error } = await supabase
                .from('students')
                .select('section')
                .eq('semester', semester)

            if (error) {
                console.error('Error fetching sections:', error.message)
                setSections([])
            } else {
                const uniqueSections = Array.from(new Set(data.map(s => s.section))).filter(Boolean)
                setSections(uniqueSections)
            }

            setSelectedSection('')
            setLoadingSections(false)
        }

        fetchSections()
    }, [semester])

    return (
        <div className="p-4 bg-white rounded shadow max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Select Semester and Section</h2>

            <label htmlFor="semester" className="block mb-1 font-medium">Semester</label>
            <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full mb-4 p-2 border rounded"
            >
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>{sem}</option>
                ))}
            </select>

            <label htmlFor="section" className="block mb-1 font-medium">Section</label>
            <select
                id="section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full mb-2 p-2 border rounded"
                disabled={!sections.length}
            >
                <option value="">Select Section</option>
                {sections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                ))}
            </select>

            {loadingSections && (
                <p className="text-sm text-gray-500">Fetching sections...</p>
            )}
        </div>
    )
}
