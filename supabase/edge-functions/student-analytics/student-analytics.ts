import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.js'

interface Step {
  name: string
  time: number
}

interface SessionResult {
  score: number
  total_time_sec: number
  steps: Step[]
}

interface Log {
  srn: string
  result: SessionResult | null
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { srn } = await req.json()

    if (!srn) {
      return new Response(
        JSON.stringify({ error: 'SRN is required' }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          }
        }
      )
    }

    // Fetch student details
    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select('*')
      .eq('srn', srn)
      .single()

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: 'Student not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch all sessions for this student
    const { data: sessions, error: sessionsError } = await supabaseClient
      .from('sessions')
      .select('id, created_at')
      .eq('srn', srn)

    if (sessionsError) throw sessionsError

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({
          srn: student.srn,
          name: student.name,
          total_sessions: 0,
          avg_score: 0,
          avg_total_time: 0,
          step_summary: {},
          flagged: false,
          outlier_steps: []
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all logs for these sessions
    const sessionIds = sessions.map((s: any) => s.id)
    const { data: logs, error: logsError } = await supabaseClient
      .from('logs')
      .select('*')
      .in('session_id', sessionIds)

    if (logsError) throw logsError

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({
          srn: student.srn,
          name: student.name,
          total_sessions: sessions.length,
          avg_score: 0,
          avg_total_time: 0,
          step_summary: {},
          flagged: false,
          outlier_steps: []
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process analytics from logs
    let totalScore = 0
    let totalTime = 0
    const stepTimes: Record<string, number[]> = {}
    let validSessionCount = 0

    logs.forEach((log: Log) => {
      const result = log.result as SessionResult | undefined
      if (!result) return
      validSessionCount++
      totalScore += result.score
      totalTime += result.total_time_sec
      result.steps.forEach((step: Step) => {
        if (!stepTimes[step.name]) {
          stepTimes[step.name] = []
        }
        stepTimes[step.name].push(step.time)
      })
    })

    const analytics = {
      srn: student.srn,
      name: student.name,
      total_sessions: validSessionCount,
      avg_score: validSessionCount ? totalScore / validSessionCount : 0,
      avg_total_time: validSessionCount ? totalTime / validSessionCount : 0,
      step_summary: {} as Record<string, { avg_time: number; is_outlier: boolean }>,
      flagged: false,
      outlier_steps: [] as string[]
    }

    // Calculate step averages and detect outliers
    Object.entries(stepTimes).forEach(([stepName, times]) => {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const sortedTimes = [...times].sort((a, b) => a - b)
      const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
      
      analytics.step_summary[stepName] = {
        avg_time: avgTime,
        is_outlier: avgTime > median * 1.5
      }

      if (analytics.step_summary[stepName].is_outlier) {
        analytics.outlier_steps.push(stepName)
      }
    })

    analytics.flagged = analytics.outlier_steps.length >= 3

    return new Response(
      JSON.stringify(analytics),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})