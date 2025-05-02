'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import nav from '@/public/nav-logo.png'
import logo from '@/public/cave-logo.png'
import headerWave from '@/public/header-removebg-preview.png'
import underConstruction from '@/public/image404.png' // <- Add your image here



export default function SessionsPage() {
    const router = useRouter()

    useEffect(() => {
        (async () => {
            const { data: { user }, error: userErr } = await supabase.auth.getUser()
            if (userErr || !user) { router.push('/'); return }
        })()
    }, [router])

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
                            <button onClick={() => router.push('/sessions')} className="text-left w-full">Sessions</button>
                            <button onClick={() => router.push('/classcreate')} className="text-left w-full">Bulk Creation</button>
                            <button onClick={() => router.push('/analytics')} className="text-left w-full font-bold underline">Analytics</button>
                        </nav>
                        <button onClick={handleLogout} className="text-left text-lg mt-10">Logout</button>
                    </div>
                </aside>

                <main className="flex-1 p-10 space-y-10 relative ml-64">
                    <Image src={headerWave} alt="Header Wave" className="absolute top-0 right-0 w-1/3 opacity-20 pointer-events-none" />

                    {/* Centered Under Construction Image */}
                    <div className="flex justify-center items-center h-[70vh]">
                        <Image src={underConstruction} alt="Under Construction" width={500} height={500} className="opacity-80 pointer-events-none" />
                    </div>
                </main>
            </div>
        </>
    )
}
