import { StatCard, PageHeader } from '@/components/ui';
import { analytics30Day, eventsByRegion, severityDistribution } from '@/data/mockData';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import { Activity, TrendingUp, Satellite, AlertTriangle } from 'lucide-react';

export function Analytics() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Analytics" subtitle="30-day trends and severity distribution" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events (30d)" value={91} delta="12%" deltaPositive={false} icon={<Activity className="w-4 h-4" />} />
        <StatCard label="Avg Risk Score" value={56} delta="4%" deltaPositive icon={<TrendingUp className="w-4 h-4" />} valueColor="#FFB020" />
        <StatCard label="Satellite Detections" value={248} delta="18" deltaPositive icon={<Satellite className="w-4 h-4" />} valueColor="#00F5FF" />
        <StatCard label="High-Risk Days" value={11} delta="3" deltaPositive={false} icon={<AlertTriangle className="w-4 h-4" />} valueColor="#FF6A3D" />
      </div>

      {/* Fire Events Over Time */}
      <div className="panel panel-glow p-5">
        <h2 className="text-sm font-semibold text-paper mb-4">Fire Events Over Time (30 days)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={analytics30Day}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,247,250,0.05)" />
            <XAxis dataKey="day" tick={{ fill: '#8FA3AD', fontSize: 10 }} interval={3} />
            <YAxis tick={{ fill: '#8FA3AD', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#06131A', border: '1px solid rgba(0,245,255,0.2)', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#8FA3AD' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="events" stroke="#00F5FF" strokeWidth={2} name="Total Events" dot={false} />
            <Line type="monotone" dataKey="highRisk" stroke="#FF6A3D" strokeWidth={2} name="High-Risk Events" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fire Events by Region */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Fire Events by Region (Top 10)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eventsByRegion} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,247,250,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8FA3AD', fontSize: 10 }} />
              <YAxis type="category" dataKey="region" tick={{ fill: '#8FA3AD', fontSize: 10 }} width={120} />
              <Tooltip
                contentStyle={{ background: '#06131A', border: '1px solid rgba(0,245,255,0.2)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#8FA3AD' }}
                cursor={{ fill: 'rgba(0,245,255,0.05)' }}
              />
              <Bar dataKey="count" fill="#00F5FF" radius={[0, 4, 4, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution — REQUIRED */}
        <div className="panel panel-glow p-5">
          <h2 className="text-sm font-semibold text-paper mb-4">Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {severityDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#06131A', border: '1px solid rgba(0,245,255,0.2)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#8FA3AD' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
