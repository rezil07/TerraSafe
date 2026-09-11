import { X } from 'lucide-react';
import { navIcons } from '@/icons';
import type { PageId } from '@/types';

interface NavEntry {
  id: PageId;
  label: string;
}

const navItems: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'live-map', label: 'Live Map' },
  { id: 'risk-analysis', label: 'Risk Analysis' },
  { id: 'fire-events', label: 'Fire Events' },
  { id: 'weather', label: 'Weather' },
  { id: 'emergency-response', label: 'Emergency Response' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'settings', label: 'Settings' },
];

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  isOpen: boolean;
  onClose: () => void;
  onGoToLanding?: () => void;
}

export function Sidebar({ activePage, onNavigate, isOpen, onClose, onGoToLanding }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen z-40
          w-60 panel border-l-0 border-t-0 border-b-0
          flex flex-col transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Wordmark / Logo (Clickable to return to Landing Page) */}
        <div className="p-5 border-b border-panel-line flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onGoToLanding}
            className="text-left group cursor-pointer focus:outline-none transition-transform active:scale-95"
            title="Return to Landing Page"
          >
            <div
              className="text-lg font-bold uppercase tracking-[0.15em] text-paper group-hover:text-cyan transition-colors"
              style={{ textShadow: '0 0 12px rgba(0, 245, 255, 0.3)' }}
            >
              TERRASAFE
            </div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-fog mt-0.5 group-hover:text-cyan/75 transition-colors">
              Earth Intelligence
            </div>
          </button>
          <button
            onClick={onClose}
            className="md:hidden text-fog hover:text-cyan"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = navIcons[item.id];
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-200 relative group
                  ${isActive
                    ? 'bg-cyan/10 text-cyan'
                    : 'text-fog hover:text-paper hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <span className="absolute right-2 w-1 h-5 rounded-full bg-cyan" />
                )}
              </button>
            );
          })}
        </nav>

        {/* System status */}
        <div className="p-4 border-t border-panel-line flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-2 h-2 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-green-400 pulse-dot" />
            </div>
            <div>
              <div className="text-xs text-paper font-medium">Systems Operational</div>
              <div className="text-[10px] text-fog">All services running</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
