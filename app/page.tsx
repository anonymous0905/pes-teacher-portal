'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
    const [status, setStatus] = useState('')
    const router = useRouter()

    const onSubmit = async (data: FormData) => {
        setStatus('Logging in...')

        const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password
        })

        if (error) {
            setStatus('Login failed: ' + error.message)
        } else {
            setStatus('Success! Redirecting...')
            router.push('/dashboard')
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-full max-w-sm bg-white p-8 rounded-lg shadow-lg"
            >
                <h1 className="text-center text-2xl font-medium mb-6 text-black">Teacher Login</h1>

                <div className="mb-4">
                    <input
                        {...register('email')}
                        placeholder="Email address"
                        className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition text-black"
                    />
                    {errors.email && (
                        <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                    )}
                </div>

                <div className="mb-6">
                    <input
                        type="password"
                        {...register('password')}
                        placeholder="Password"
                        className="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-black transition text-black"
                    />
                    {errors.password && (
                        <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full rounded bg-black py-2 text-sm text-white hover:opacity-90 transition"
                >
                    Log In
                </button>

                {status && (
                    <p className="mt-4 text-center text-xs text-gray-600">{status}</p>
                )}

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <span
                        onClick={() => router.push('/signup')}
                        className="text-blue-600 hover:underline cursor-pointer"
                    >
                        Sign up here
                    </span>
                </p>
            </form>
        </div>
    )
}
