'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const schema = z.object({
    name: z.string().min(2, 'Display name is required'),
    email: z.string().email().refine(
        (val) => val.endsWith('@pes.edu') || val.endsWith('@pesu.pes.edu'),
        { message: 'Only PES email domains allowed' }
    ),
    password: z.string().min(6, 'Password must be at least 6 characters')
})

type FormData = z.infer<typeof schema>

export default function SignupPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
    const [status, setStatus] = useState('')
    const router = useRouter()

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
        <main className="min-h-screen flex items-center justify-center bg-white text-gray-900">
            <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-2xl font-semibold mb-6">Teacher Signup</h1>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <input
                            {...register('name')}
                            placeholder="Full Name"
                            className="w-full border-b border-gray-300 focus:outline-none py-2"
                        />
                        {errors.name && (
                            <p className="text-xs text-red-500">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <input
                            {...register('email')}
                            placeholder="PES Email"
                            className="w-full border-b border-gray-300 focus:outline-none py-2"
                        />
                        {errors.email && (
                            <p className="text-xs text-red-500">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <input
                            type="password"
                            {...register('password')}
                            placeholder="Password"
                            className="w-full border-b border-gray-300 focus:outline-none py-2"
                        />
                        {errors.password && (
                            <p className="text-xs text-red-500">{errors.password.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 rounded bg-black text-white"
                    >
                        Sign Up
                    </button>

                    {status && <p className="text-xs text-red-500">{status}</p>}
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <span
                        onClick={() => router.push('/')}
                        className="text-blue-600 hover:underline cursor-pointer"
                    >
                        Login here
                    </span>
                </p>
            </div>
        </main>
    )
}
