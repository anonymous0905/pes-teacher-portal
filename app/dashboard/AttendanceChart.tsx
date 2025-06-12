'use client'
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DayStat {
  date: string
  count: number
}

export default function AttendanceChart() {
  const [data, setData] = useState<DayStat[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const start = new Date()
      start.setDate(start.getDate() - 6)
      const { data: logs, error } = await supabase
        .from('logs')
        .select('created_at')
        .gte('created_at', start.toISOString())
      if (error) {
        console.error('Failed to fetch attendance', error)
        return
      }
      const counts: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        counts[formatDate(d)] = 0
      }
      ;(logs || []).forEach((l) => {
        const date = formatDate(new Date(l.created_at))
        if (counts[date] !== undefined) counts[date]++
      })
      const arr = Object.entries(counts)
        .sort(([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime())
        .map(([date, count]) => ({ date, count }))
      setData(arr)
    }
    fetchData()
  }, [])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReLineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#555" />
        <XAxis dataKey="date" stroke="#ccc" />
        <YAxis stroke="#ccc" />
        <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
        <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={3} dot={{ stroke: '#22c55e', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
      </ReLineChart>
    </ResponsiveContainer>
  )
}

function formatDate(d: Date) {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  return `${day}-${month}-${year}`
}

function parseDate(s: string) {
  const [day, month, year] = s.split('-').map(Number)
  return new Date(2000 + year, month - 1, day)
}
