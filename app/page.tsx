'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import vrDoctorsImg from '@/public/login-side.png' // Replace with your actual path
import { useRouter } from 'next/navigation'


const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema)
    })
    const [status, setStatus] = useState('')
    const router = useRouter()

    // ✅ Auth guard inside component
    useEffect(() => {
        (async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (user && !error) {
                router.push('/dashboard')
            }
        })()
    }, [router])

    const onSubmit = async (data: FormData) => {
        setStatus('Logging in...')
        const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        })

        if (error) {
            setStatus('Login failed: ' + error.message)
        } else {
            setStatus('Success! Redirecting...')
            router.push('/dashboard')
        }
    }

    return (
        <div className="flex h-screen w-screen">
            {/* Left Panel */}
            <div className="w-1/2 bg-black flex items-center justify-center">
                <div className="bg-white p-8 sm:p-10 lg:p-12 rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg">
                    <h1 className="text-3xl font-bold text-black mb-6 text-center">Faculty Sign in</h1>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <input
                            {...register('email')}
                            placeholder="Email"
                            className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none"
                        />
                        {errors.email && (
                            <p className="text-xs text-red-500">{errors.email.message}</p>
                        )}

                        <input
                            type="password"
                            {...register('password')}
                            placeholder="Password"
                            className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none"
                        />
                        {errors.password && (
                            <p className="text-xs text-red-500">{errors.password.message}</p>
                        )}

                        <button
                            type="submit"
                            className="w-full rounded-full bg-orange-300 text-black font-bold py-2 text-lg hover:opacity-90 transition"
                        >
                            Log In
                        </button>

                        {status && (
                            <p className="text-xs text-center text-gray-600 mt-2">{status}</p>
                        )}

                        <p className="text-sm text-center text-gray-600 mt-6">
                            Don&apos;t have account?{' '}
                            <span
                                onClick={() => router.push('/signup')}
                                className="text-blue-600 hover:underline cursor-pointer"
                            >
        Signup here
      </span>
                        </p>
                    </form>
                </div>

                <div className="absolute top-6 left-9 text-white font-bold text-2xl tracking-wide">
                    PESU Simulation Suite
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-1/2 relative bg-black">
                <Image
                    src={vrDoctorsImg}
                    alt="Doctors using VR"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-l-none"
                />

            </div>
        </div>
    )
}
