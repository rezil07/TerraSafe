import { RISK_COLORS, RISK_LABELS, type RiskLevel } from '@/types';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
}

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const color = RISK_COLORS[level];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding}`}
      style={{
        color,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}40`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {RISK_LABELS[level]}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    Active: '#FF3B30',
    Contained: '#FFB020',
    Monitored: '#00F5FF',
    Controlled: '#00FF88',
  };
  const color = colors[status] || '#8FA3AD';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        color,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}40`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  valueColor?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, delta, deltaPositive, valueColor, icon }: StatCardProps) {
  return (
    <div className="panel panel-glow p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-fog text-xs uppercase tracking-wider font-medium">{label}</span>
        {icon && <div className="text-cyan opacity-60">{icon}</div>}
      </div>
      <div className="text-3xl font-semibold font-mono" style={{ color: valueColor || '#F5F7FA' }}>
        {value}
      </div>
      {delta && (
        <div className="flex items-center gap-1 text-xs">
          <span style={{ color: deltaPositive ? '#00FF88' : '#FF6A3D' }}>
            {deltaPositive ? '▲' : '▼'} {delta}
          </span>
          <span className="text-fog">vs last period</span>
        </div>
      )}
    </div>
  );
}

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionTitle({ title, subtitle, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-paper">{title}</h2>
        {subtitle && <p className="text-fog text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface ConfidenceBarProps {
  value: number;
}

export function ConfidenceBar({ value }: ConfidenceBarProps) {
  const color = value >= 80 ? '#00F5FF' : value >= 60 ? '#FFB020' : '#FF6A3D';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono text-fog">{value}%</span>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-paper tracking-tight">{title}</h1>
      {subtitle && <p className="text-fog text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
