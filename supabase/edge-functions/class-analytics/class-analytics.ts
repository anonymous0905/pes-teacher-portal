import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    const { semester, section } = await req.json()

    // Fetch all students in the class
    const { data: students, error: studentsError } = await supabaseClient
      .from('students')
      .select('*')
      .eq('semester', semester)
      .eq('section', section)

    if (studentsError) throw studentsError
    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No students found for this class',
          students_analyzed: 0,
          avg_score: 0,
          avg_total_time: 0,
          step_medians: {},
          bottleneck_steps: [],
          flagged_students: []
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Fetch all sessions for these students
    const srns = students.map(s => s.srn)
    const { data: sessions, error: sessionsError } = await supabaseClient
      .from('sessions')
      .select('id, srn')
      .in('srn', srns)

    if (sessionsError) throw sessionsError
    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No sessions found for this class',
          students_analyzed: students.length,
          avg_score: 0,
          avg_total_time: 0,
          step_medians: {},
          bottleneck_steps: [],
          flagged_students: []
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
          error: 'No logs found for this class',
          students_analyzed: students.length,
          avg_score: 0,
          avg_total_time: 0,
          step_medians: {},
          bottleneck_steps: [],
          flagged_students: []
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process analytics
    const analytics = {
      class: `${semester}${section}`,
      students_analyzed: students.length,
      avg_score: 0,
      avg_total_time: 0,
      step_medians: {} as Record<string, number>,
      bottleneck_steps: [] as string[],
      flagged_students: [] as Array<{
        srn: string
        name: string
        score: number
        avg_time: number
        flagged_for: string
      }>
    }

    // Calculate class averages and step times
    let totalScore = 0
    let totalTime = 0
    let validSessionCount = 0
    const stepTimes: Record<string, number[]> = {}
    const studentAnalytics: Record<string, {
      srn: string
      name: string
      total_sessions: number
      total_score: number
      total_time: number
      step_times: Record<string, number[]>
    }> = {}

    logs.forEach((log: Log) => {
      const result = log.result as SessionResult | undefined
      if (!result) return
      validSessionCount++
      const srn = log.srn
      const student = students.find(s => s.srn === srn)
      if (!student) return
      if (!studentAnalytics[srn]) {
        studentAnalytics[srn] = {
          srn,
          name: student.name,
          total_sessions: 0,
          total_score: 0,
          total_time: 0,
          step_times: {}
        }
      }
      studentAnalytics[srn].total_sessions++
      studentAnalytics[srn].total_score += result.score
      studentAnalytics[srn].total_time += result.total_time_sec
      totalScore += result.score
      totalTime += result.total_time_sec
      result.steps.forEach((step: Step) => {
        if (!stepTimes[step.name]) {
          stepTimes[step.name] = []
        }
        stepTimes[step.name].push(step.time)
        if (!studentAnalytics[srn].step_times[step.name]) {
          studentAnalytics[srn].step_times[step.name] = []
        }
        studentAnalytics[srn].step_times[step.name].push(step.time)
      })
    })

    analytics.avg_score = validSessionCount ? totalScore / validSessionCount : 0
    analytics.avg_total_time = validSessionCount ? totalTime / validSessionCount : 0

    // Calculate step medians and detect bottlenecks
    Object.entries(stepTimes).forEach(([stepName, times]) => {
      const sortedTimes = [...times].sort((a, b) => a - b)
      const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
      analytics.step_medians[stepName] = median
      if (median > 15) {
        analytics.bottleneck_steps.push(stepName)
      }
    })

    // Process student analytics and flag outliers
    Object.values(studentAnalytics).forEach(student => {
      const avgScore = student.total_score / student.total_sessions
      const avgTime = student.total_time / student.total_sessions
      let slowSteps = 0
      const slowStepNames: string[] = []
      Object.entries(student.step_times).forEach(([stepName, times]) => {
        const avgStepTime = times.reduce((a, b) => a + b, 0) / times.length
        const medianTime = analytics.step_medians[stepName]
        if (avgStepTime > medianTime * 1.5) {
          slowSteps++
          slowStepNames.push(stepName)
        }
      })
      if (slowSteps >= 3 || avgScore < (analytics.avg_score - 5)) {
        analytics.flagged_students.push({
          srn: student.srn,
          name: student.name,
          score: avgScore,
          avg_time: avgTime,
          flagged_for: slowSteps >= 3 
            ? `Slow Steps: ${slowStepNames.join(', ')}`
            : 'Low Score'
        })
      }
    })

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