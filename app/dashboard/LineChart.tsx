'use client'

import {
    LineChart as ReLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useState, useEffect } from 'react';

interface SessionStats {
    date: string;
    count: number;
}

export default function LineChart() {
    const [chartData, setChartData] = useState<SessionStats[]>([]);

    useEffect(() => {
        const fetchSessionData = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sessions-per-day`
                );
                if (!res.ok) throw new Error('Failed to fetch session data');
                const data: SessionStats[] = await res.json();

                setChartData(data);
            } catch (err) {
                console.error('❌ Error fetching session stats:', err);
            }
        };

        fetchSessionData();
    }, []);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#555" />
                <XAxis dataKey="date" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none' }} />
                <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ stroke: '#f97316', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </ReLineChart>
        </ResponsiveContainer>
    );
}
