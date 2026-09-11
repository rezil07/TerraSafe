import { Search, Satellite, Menu } from 'lucide-react';
import type { PageId } from '@/types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (page: PageId) => void;
}

export function Header({ onToggleSidebar, onNavigate }: HeaderProps) {
  return (
    <header className="h-14 panel border-l-0 border-r-0 border-t-0 flex items-center justify-between px-4 md:px-6 gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-fog hover:text-cyan transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fog" />
          <input
            type="text"
            placeholder="Search fire events, locations, zones..."
            className="w-full bg-void border border-panel-line rounded-lg pl-10 pr-4 py-2 text-sm text-paper placeholder-fog/60 focus:outline-none focus:border-cyan/40 transition-colors"
            onFocus={() => onNavigate('fire-events')}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan/30 bg-cyan/5">
          <Satellite className="w-3.5 h-3.5 text-cyan" />
          <span className="text-xs font-medium text-cyan">Satellite Link</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan pulse-dot" />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan/30 to-cyan-dim flex items-center justify-center text-xs font-semibold text-paper">
            OP
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-medium text-paper leading-tight">Operations</div>
            <div className="text-[10px] text-fog leading-tight">TERRASAFE Command</div>
          </div>
        </div>
      </div>
    </header>
  );
}
