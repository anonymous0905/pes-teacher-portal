import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data.users })
}

export async function POST(req: NextRequest) {
  const { action, id, email } = await req.json()
  try {
    if (!action || !id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (action === 'ban') {
      const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: '8760h' })
      if (error) throw error
    } else if (action === 'unban') {
      const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' })
      if (error) throw error
    } else if (action === 'delete') {
      const { error } = await supabase.auth.admin.deleteUser(id)
      if (error) throw error
    } else if (action === 'resetPassword') {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email
      })
      if (error) throw error
      const link = data?.properties?.action_link || data?.action_link
      if (link) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER!,
            pass: process.env.GMAIL_PASS!
          }
        })
        await transporter.sendMail({
          from: process.env.GMAIL_USER!,
          to: email,
          subject: 'Password Reset',
          text: `Reset your password using the following link: ${link}`
        })
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
