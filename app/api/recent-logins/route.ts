import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 50 })
    if (error) {
      console.error(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const users = (data.users || [])
      .filter((u) => u.last_sign_in_at)
      .sort(
        (a, b) =>
          new Date(b.last_sign_in_at as string).getTime() -
          new Date(a.last_sign_in_at as string).getTime()
      )
      .slice(0, 10)
      .map((u) => ({ email: u.email, last_sign_in_at: u.last_sign_in_at }))
    return NextResponse.json({ users })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch logins' }, { status: 500 })
  }
}
