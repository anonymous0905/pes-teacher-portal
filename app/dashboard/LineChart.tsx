'use client'

import {
    LineChart as ReLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

const dummyData = [
    { name: 'S1', score: 72 },
    { name: 'S2', score: 85 },
    { name: 'S3', score: 90 },
    { name: 'S4', score: 60 },
    { name: 'S5', score: 95 },
    { name: 'S6', score: 88 }
]

export default function LineChart() {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={dummyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#555" />
                <XAxis dataKey="name" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#f97316" // orange
                    strokeWidth={3}
                    dot={{ stroke: '#f97316', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </ReLineChart>
        </ResponsiveContainer>
    )
}
