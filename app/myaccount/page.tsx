'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { allowedAdmins } from '@/lib/constants'
import nav from '@/public/nav-logo.png'
import logo from '@/public/cave-logo1.png'
import headerWave from '@/public/header-removebg-preview.png'

export default function AccountPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
      } else {
        setName(user.user_metadata?.name || '')
        setEmail(user.email || '')
        setIsAdmin(allowedAdmins.includes(user.email ?? ''))
      }
    })()
  }, [router])

  const handleUpdateName = async () => {
    const { error } = await supabase.auth.updateUser({ data: { name } })
    if (error) setStatus('Update failed: ' + error.message)
    else setStatus('Name updated successfully')
  }

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setStatus('Password reset failed: ' + error.message)
    else setStatus('Password reset email sent')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex min-h-screen text-white bg-[#1a1a1a]">
      <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />
      <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
        <div>
          <Image src={logo} alt="Logo" width={200} height={200} className="mb-8" />
          <nav className="space-y-4 text-xl">
            <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
            <button onClick={() => router.push('/sessions')} className="text-left w-full">Sessions</button>
            <button onClick={() => router.push('/classcreate')} className="text-left w-full">Bulk Creation</button>
            <button onClick={() => router.push('/analytics')} className="text-left w-full">Analytics</button>
            <button onClick={() => router.push('/questions')}className="text-left w-full">Manage Questions</button>
            {isAdmin && (
            <button onClick={() => router.push('/admin')} className="text-left w-full">Admin</button>
            )}
            <button onClick={() => router.push('/myaccount')} className="text-left w-full bg-gray-200 text-black rounded px-1 py-1">My Account</button>
          </nav>
          <button onClick={handleLogout} className="text-left text-lg mt-10">Logout</button>
        </div>
      </aside>
      <main className="flex-1 p-10 space-y-10 relative ml-64">
        <Image src={headerWave} alt="Header Wave" className="absolute top-0 right-0 w-1/3 opacity-20 pointer-events-none" />
        <h2 className="text-3xl font-bold">My Account</h2>
        <section className="bg-[#2a2a2a] p-6 rounded-2xl max-w-md space-y-4">
          <div>
            <label className="block mb-2">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-white text-black" />
            <button onClick={handleUpdateName} className="mt-2 py-2 px-4 bg-white text-black rounded font-bold">Save</button>
          </div>
          <div className="pt-4 border-t border-gray-600">
            <button onClick={handleResetPassword} className="py-2 px-4 bg-white text-black rounded font-bold">Send Password Reset Email</button>
          </div>
          {status && <p className="text-sm mt-2">{status}</p>}
        </section>
      </main>
    </div>
  )
}
