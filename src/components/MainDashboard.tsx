import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { PageId } from '@/types';

interface MainDashboardProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onGoToLanding?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchFocus?: () => void;
  children: React.ReactNode;
}

export function MainDashboard({
  activePage,
  onNavigate,
  onGoToLanding,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  children,
}: MainDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-void">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onGoToLanding={onGoToLanding}
      />
      <div className="md:pl-60 flex flex-col min-h-screen min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={onNavigate}
          onGoToLanding={onGoToLanding}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onSearchFocus={onSearchFocus}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
