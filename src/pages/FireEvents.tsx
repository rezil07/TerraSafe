import { useState, useMemo, useEffect } from 'react';
import { RiskBadge, StatusBadge, ConfidenceBar, PageHeader } from '@/components/ui';
import { fireEvents as defaultFires } from '@/data/mockData';
import type { FireStatus, RiskLevel, FireEvent } from '@/types';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchFires } from '@/services/api';

type SortKey = 'id' | 'location' | 'detected' | 'source' | 'confidence' | 'riskScore' | 'status';
type SortDir = 'asc' | 'desc';

interface FireEventsProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function FireEvents({ searchQuery = '', onSearchChange }: FireEventsProps) {
  const [firesList, setFiresList] = useState<FireEvent[]>(defaultFires);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<FireStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('detected');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(15);

  useEffect(() => {
    fetchFires().then((data) => {
      if (data && data.length > 0) setFiresList(data);
    });
  }, []);

  const filtered = useMemo(() => {
    let events = [...firesList];
    if (riskFilter !== 'all') events = events.filter((e) => e.riskLevel === riskFilter);
    if (sourceFilter !== 'all') events = events.filter((e) => e.source === sourceFilter);
    if (statusFilter !== 'all') events = events.filter((e) => e.status === statusFilter);
    
    const activeSearch = searchQuery.trim().toLowerCase();
    if (activeSearch) {
      events = events.filter((e) =>
        e.name.toLowerCase().includes(activeSearch) ||
        e.location.toLowerCase().includes(activeSearch) ||
        e.id.toLowerCase().includes(activeSearch)
      );
    }
    events.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'detected') cmp = a.detected.localeCompare(b.detected);
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), 'en', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return events;
  }, [firesList, riskFilter, sourceFilter, statusFilter, sortKey, sortDir, searchQuery]);

  const visible = filtered.slice(0, visibleCount);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="inline-block w-3" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Fire Events" subtitle="All detected fire events with risk and status" />
        <div className="text-xs font-mono text-cyan bg-cyan/10 px-3 py-1 rounded-full border border-cyan/25">
          {filtered.length} of {firesList.length} events matching
        </div>
      </div>

      {/* Filters toolbar driven by top searchbar */}
      <div className="panel p-3 flex flex-wrap items-center gap-3">
        {searchQuery ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan/10 border border-cyan/30 text-xs text-cyan">
            <span className="text-fog">Active Search:</span>
            <span className="font-semibold text-paper">&ldquo;{searchQuery}&rdquo;</span>
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="hover:text-paper ml-1 text-fog hover:bg-cyan/20 p-0.5 rounded transition-colors"
              title="Clear search"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="text-xs text-fog flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-cyan/60 animate-pulse" />
            Use top search bar to filter by sector, district, state, or ID
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
            className="bg-void border border-panel-line rounded-lg px-3 py-1.5 text-xs text-paper focus:outline-none focus:border-cyan/40"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low (0–39)</option>
            <option value="medium">Medium (40–69)</option>
            <option value="high">High (70–89)</option>
            <option value="critical">Critical (90–100)</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-void border border-panel-line rounded-lg px-3 py-1.5 text-xs text-paper focus:outline-none focus:border-cyan/40"
          >
            <option value="all">All Sources</option>
            <option value="NASA FIRMS">NASA FIRMS</option>
            <option value="MODIS">MODIS</option>
            <option value="VIIRS">VIIRS</option>
            <option value="GOES">GOES</option>
            <option value="Ground Report">Ground Report</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FireStatus | 'all')}
            className="bg-void border border-panel-line rounded-lg px-3 py-1.5 text-xs text-paper focus:outline-none focus:border-cyan/40"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Contained">Contained</option>
            <option value="Monitored">Monitored</option>
            <option value="Controlled">Controlled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="panel panel-glow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel-line text-xs uppercase tracking-wider text-fog">
                <th className="text-left px-3 py-3 w-16">Sr. No.</th>
                <th className="text-left px-3 py-3 cursor-pointer hover:text-cyan" onClick={() => handleSort('id')}>
                  Fire ID <SortIcon col="id" />
                </th>
                <th className="text-left px-4 py-3 cursor-pointer hover:text-cyan" onClick={() => handleSort('location')}>
                  Location & Sector <SortIcon col="location" />
                </th>
                <th className="text-left px-3 py-3 cursor-pointer hover:text-cyan" onClick={() => handleSort('detected')}>
                  Detected <SortIcon col="detected" />
                </th>
                <th className="text-left px-3 py-3 cursor-pointer hover:text-cyan" onClick={() => handleSort('source')}>
                  Source <SortIcon col="source" />
                </th>
                <th className="text-left px-4 py-3 cursor-pointer hover:text-cyan" onClick={() => handleSort('confidence')}>
                  Confidence <SortIcon col="confidence" />
                </th>
                <th className="text-left px-4 py-3 cursor-pointer hover:text-cyan" onClick={() => handleSort('riskScore')}>
                  Risk <SortIcon col="riskScore" />
                </th>
                <th className="text-left px-3 py-3 cursor-pointer hover:text-cyan" onClick={() => handleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="text-left px-3 py-3">
                  SOS Action
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ev, idx) => (
                <tr
                  key={ev.id}
                  className="border-b border-panel-line/50 hover:bg-cyan/5 transition-colors"
                >
                  <td className="px-3 py-3 font-mono text-xs text-fog/70">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[11px] text-cyan bg-cyan/10 px-1.5 py-0.5 rounded border border-cyan/25 whitespace-nowrap">
                      {ev.id}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-paper font-medium text-sm">{ev.name}</div>
                    <div className="text-xs text-fog">{ev.location}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-fog">{ev.detectedRelative}</td>
                  <td className="px-3 py-3 text-xs text-fog">{ev.source}</td>
                  <td className="px-4 py-3"><ConfidenceBar value={ev.confidence} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm" style={{ color: `var(--risk-${ev.riskLevel})` }}>
                        {ev.riskScore}
                      </span>
                      <RiskBadge level={ev.riskLevel} size="sm" />
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={ev.status} /></td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-cyan/30 bg-cyan/10 text-cyan whitespace-nowrap">
                      {ev.sosStatus || (ev.riskScore >= 70 ? 'ESCALATION_INITIATED' : ev.riskScore >= 40 ? 'MONITOR' : 'NO_ESCALATION')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {visibleCount < filtered.length && (
          <div className="p-4 text-center">
            <button
              onClick={() => setVisibleCount(visibleCount + 10)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan/30 text-cyan text-sm hover:bg-cyan/10 transition-colors"
            >
              Load more ({filtered.length - visibleCount} remaining) <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-fog text-sm">No events match the current filters</div>
        )}
      </div>
    </div>
  );
}
