import { PageHeader } from '@/components/ui';
import { dataSources } from '@/data/mockData';
import { ChevronRight, Database, Cloud, Cpu } from 'lucide-react';

const typeConfig = {
  Observed: { icon: Database, color: '#00F5FF' },
  Derived: { icon: Cloud, color: '#FFB020' },
  Predicted: { icon: Cpu, color: '#FF6A3D' },
};

export function DataSources() {
  const groups = ['Observed', 'Derived', 'Predicted'] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Data Sources" subtitle="Pipeline from observation to prediction" />

      {/* Pipeline visual */}
      <div className="panel panel-glow p-5">
        <h2 className="text-sm font-semibold text-paper mb-4">Data Pipeline</h2>
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2">
          {groups.map((type, i) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            return (
              <div key={type} className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                  style={{ borderColor: `${config.color}40`, backgroundColor: `${config.color}0d` }}
                >
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                  <div>
                    <div className="text-sm font-semibold text-paper">{type}</div>
                    <div className="text-xs text-fog">Data {type === 'Observed' ? 'Collection' : type === 'Derived' ? 'Processing' : 'Modeling'}</div>
                  </div>
                </div>
                {i < groups.length - 1 && <ChevronRight className="w-4 h-4 text-fog flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Source cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataSources.map((ds) => {
          const config = typeConfig[ds.type];
          const Icon = config.icon;
          return (
            <div key={ds.id} className="panel panel-glow p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                  <h3 className="text-base font-semibold text-paper">{ds.name}</h3>
                </div>
                {ds.simulated && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 uppercase tracking-wider">
                    Simulated
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs mb-3 flex-1">
                <div className="flex justify-between">
                  <span className="text-fog">Provider</span>
                  <span className="text-paper">{ds.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fog">Update Frequency</span>
                  <span className="text-paper">{ds.updateFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fog">Coverage</span>
                  <span className="text-paper">{ds.coverage}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-panel-line">
                {ds.features.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-1 rounded-md border border-panel-line bg-void/50 text-fog"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
