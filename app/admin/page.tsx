'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { allowedAdmins } from '@/lib/constants'
import Image from 'next/image'
import logo from '@/public/cave-logo1.png'
import nav from '@/public/nav-logo.png'
import headerWave from '@/public/header-removebg-preview.png'

interface Procedure {
  id: string
  procedure_name: string
  package_name: string
  accept_questions: boolean
  areas: any
}

export default function AdminProceduresPage() {
  const router = useRouter()

  const [authorized, setAuthorized] = useState(false)
  const [checked, setChecked] = useState(false)

  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [editing, setEditing] = useState<Procedure | null>(null)
  const [form, setForm] = useState({
    procedure_name: '',
    package_name: '',
    accept_questions: false,
    areas: ''
  })

  useEffect(() => {
    ;(async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!user || error) { router.push('/') ; return }
      setAuthorized(allowedAdmins.includes(user.email ?? ''))
      setChecked(true)
    })()
  }, [router])

  useEffect(() => {
    if (!authorized) return
    const fetchProcedures = async () => {
      const { data } = await supabase.from('procedures').select('*')
      const mapped = (data ?? []).map((p: any) => ({
        id: p.id,
        procedure_name: p.procedure_name,
        package_name: p.package_name,
        accept_questions: p['Accept Questions'] ?? p.accept_questions ?? false,
        areas: p.areas
      })) as Procedure[]
      setProcedures(mapped)
    }
    fetchProcedures()
  }, [authorized])

  const resetForm = () => {
    setEditing(null)
    setForm({ procedure_name: '', package_name: '', accept_questions: false, areas: '' })
  }

  const handleSave = async () => {
    let areasData: any = null
    if (form.areas.trim()) {
      try { areasData = JSON.parse(form.areas) } catch { alert('Areas must be valid JSON'); return }
    }
    const payload: any = {
      procedure_name: form.procedure_name,
      package_name: form.package_name,
      'Accept Questions': form.accept_questions,
      areas: areasData
    }
    let error
    if (editing) {
      ;({ error } = await supabase.from('procedures').update(payload).eq('id', editing.id))
    } else {
      ;({ error } = await supabase.from('procedures').insert(payload))
    }
    if (error) return alert('Error: ' + error.message)
    const { data } = await supabase.from('procedures').select('*')
    const mapped = (data ?? []).map((p: any) => ({
      id: p.id,
      procedure_name: p.procedure_name,
      package_name: p.package_name,
      accept_questions: p['Accept Questions'] ?? p.accept_questions ?? false,
      areas: p.areas
    })) as Procedure[]
    setProcedures(mapped)
    resetForm()
  }

  const handleEdit = (p: Procedure) => {
    setEditing(p)
    setForm({
      procedure_name: p.procedure_name,
      package_name: p.package_name,
      accept_questions: p.accept_questions,
      areas: p.areas ? JSON.stringify(p.areas, null, 2) : ''
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this procedure?')) return
    const { error } = await supabase.from('procedures').delete().eq('id', id)
    if (error) return alert('Error: ' + error.message)
    setProcedures(procedures.filter(p => p.id !== id))
    if (editing && editing.id === id) resetForm()
  }

  if (!checked) return <div className="p-10 text-white">Loading...</div>
  if (!authorized) return <div className="p-10 text-white">Not authorized.</div>

  return (
    <div className="flex min-h-screen text-white bg-[#1a1a1a]">
      <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />
      <aside className="w-64 bg-black p-6 fixed top-0 left-0 h-full z-30">
        <Image src={logo} alt="Logo" width={200} height={200} className="mb-8" />
        <nav className="space-y-4 text-xl">
          <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
          <button onClick={() => router.push('/sessions')} className="text-left w-full">Sessions</button>
          <button onClick={() => router.push('/classcreate')} className="text-left w-full">Bulk Creation</button>
          <button onClick={() => router.push('/analytics')} className="text-left w-full">Analytics</button>
          <button onClick={() => router.push('/questions')} className="text-left w-full">Manage Questions</button>
          <button onClick={() => router.push('/admin')} className="text-left w-full bg-gray-200 text-black rounded px-2 py-1">Admin</button>
          <button onClick={() => router.push('/myaccount')} className="text-left w-full">My Account</button>
        </nav>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-left text-lg mt-10">Logout</button>
      </aside>
      <main className="flex-1 p-10 space-y-10 ml-64">
        <Image src={headerWave} alt="Header" className="absolute top-0 right-0 w-1/3 opacity-20 pointer-events-none" />
        <section className="bg-[#2a2a2a] p-6 rounded-2xl">
          <h3 className="text-2xl font-bold mb-4">{editing ? 'Edit Procedure' : 'Add Procedure'}</h3>
          <div className="space-y-4">
            <input value={form.procedure_name} onChange={e => setForm({ ...form, procedure_name: e.target.value })} placeholder="Procedure Name" className="w-full p-2 rounded bg-white text-black" />
            <input value={form.package_name} onChange={e => setForm({ ...form, package_name: e.target.value })} placeholder="Package Name" className="w-full p-2 rounded bg-white text-black" />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.accept_questions} onChange={e => setForm({ ...form, accept_questions: e.target.checked })} />
              Accept Questions
            </label>
            <textarea value={form.areas} onChange={e => setForm({ ...form, areas: e.target.value })} placeholder="Areas JSON" className="w-full p-2 rounded bg-white text-black" />
            <div className="flex gap-4">
              <button onClick={handleSave} className="py-2 px-4 bg-white text-black rounded">Save</button>
              {editing && <button onClick={resetForm} className="py-2 px-4 bg-gray-600 rounded">Cancel</button>}
            </div>
          </div>
        </section>
        <section className="bg-[#2a2a2a] p-6 rounded-2xl">
          <h3 className="text-2xl font-bold mb-4">Existing Procedures</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="py-2">Name</th>
                  <th>Package</th>
                  <th>Accept Q</th>
                  <th>Areas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {procedures.map(p => (
                  <tr key={p.id} className="border-b border-gray-800">
                    <td className="py-2">{p.procedure_name}</td>
                    <td>{p.package_name}</td>
                    <td>{p.accept_questions ? 'Yes' : 'No'}</td>
                    <td className="whitespace-pre-wrap">{p.areas ? JSON.stringify(p.areas) : ''}</td>
                    <td className="space-x-2">
                      <button onClick={() => handleEdit(p)} className="px-2 py-1 bg-white text-black rounded">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
