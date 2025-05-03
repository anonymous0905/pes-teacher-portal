'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import vrDoctorsImg from '@/public/building-logo.png'
import { useRouter } from 'next/navigation'

const schema = z.object({
    name: z.string().min(2, 'Display name is required'),
    email: z.string().email().refine(
        (val) => val.endsWith('@pes.edu') || val.endsWith('@pesu.pes.edu'),
        { message: 'Only PES email domains allowed' }
    ),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function SignupPage() {
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
        setStatus('Creating account...')

        const { error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    name: data.name,
                }
            }
        })

        if (error) {
            setStatus('Signup failed: ' + error.message)
        } else {
            setStatus('Signup successful! Please check your email to confirm.')
        }
    }

    return (
        <div className="flex h-screen w-screen ">
            {/* Left Panel with Image */}
            <div className="w-1/2 relative pointer-events-none" style={{ backgroundColor: '#1b1b1b' }}>
                <Image
                    src={vrDoctorsImg}
                    alt="Doctors using VR"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-r-none"
                />
                <div className="absolute top-6 left-6 text-white font-bold text-2xl tracking-wide">
                    PESU Simulation Suite
                </div>
            </div>

            {/* Right Panel with Signup Form */}
            <div className="w-1/2 flex items-center justify-center" style={{ backgroundColor: '#1b1b1b' }}>
                <div className="bg-white p-8 sm:p-10 lg:p-12 rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg">
                    <h1 className="text-3xl font-bold text-black mb-6 text-center">Faculty Signup</h1>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <input
                            {...register('name')}
                            placeholder="Full Name"
                            className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none"
                        />
                        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}

                        <input
                            {...register('email')}
                            placeholder="PES Email"
                            className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none"
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}

                        <input
                            type="password"
                            {...register('password')}
                            placeholder="Password"
                            className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none"
                        />
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}

                        <button
                            type="submit"
                            className="w-full rounded-full bg-orange-300 text-black font-bold py-2 text-lg hover:opacity-90 transition"
                        >
                            Sign Up
                        </button>

                        {status && <p className="text-xs text-center text-gray-600 mt-2">{status}</p>}

                        <p className="text-sm text-center text-gray-600 mt-6">
                            Already have an account?{' '}
                            <span
                                onClick={() => router.push('/')}
                                className="text-blue-600 hover:underline cursor-pointer"
                            >
                Login here
              </span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
