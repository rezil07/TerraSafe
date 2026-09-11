import { Search, Satellite, Menu, X } from 'lucide-react';
import type { PageId } from '@/types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (page: PageId) => void;
  onGoToLanding?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchFocus?: () => void;
}

export function Header({
  onToggleSidebar,
  onNavigate,
  onGoToLanding,
  searchQuery = '',
  onSearchChange,
  onSearchFocus,
}: HeaderProps) {
  return (
    <header className="h-14 panel border-l-0 border-r-0 border-t-0 flex items-center justify-between px-4 md:px-6 gap-4 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-fog hover:text-cyan transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile quick logo */}
        <button
          type="button"
          onClick={onGoToLanding}
          className="md:hidden font-bold text-xs uppercase tracking-wider text-paper hover:text-cyan flex-shrink-0"
          title="Return to Landing Page"
        >
          TERRASAFE
        </button>

        {/* Primary Fire Events Search Bar on top */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan/70 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
            }}
            onFocus={() => {
              onSearchFocus?.();
            }}
            placeholder="Search fire events by sector, district, state, or ID..."
            className="w-full bg-void border border-panel-line rounded-lg pl-9 pr-8 py-1.5 text-xs sm:text-sm text-paper placeholder-fog/60 focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fog hover:text-paper text-xs p-0.5 rounded transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
