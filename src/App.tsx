import { useState, lazy, Suspense } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { MainDashboard } from '@/components/MainDashboard';
import type { PageId } from '@/types';

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const LiveMap = lazy(() => import('@/pages/LiveMap').then((m) => ({ default: m.LiveMap })));
const RiskAnalysis = lazy(() => import('@/pages/RiskAnalysis').then((m) => ({ default: m.RiskAnalysis })));
const FireEvents = lazy(() => import('@/pages/FireEvents').then((m) => ({ default: m.FireEvents })));
const Weather = lazy(() => import('@/pages/Weather').then((m) => ({ default: m.Weather })));
const EmergencyResponse = lazy(() => import('@/pages/EmergencyResponse').then((m) => ({ default: m.EmergencyResponse })));
const Analytics = lazy(() => import('@/pages/Analytics').then((m) => ({ default: m.Analytics })));
const DataSources = lazy(() => import('@/pages/DataSources').then((m) => ({ default: m.DataSources })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-cyan/20 border-t-cyan animate-spin" />
    </div>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [page, setPage] = useState<PageId>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  if (!entered) {
    return <LandingPage onEnter={() => setEntered(true)} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'live-map': return <LiveMap />;
      case 'risk-analysis': return <RiskAnalysis />;
      case 'fire-events': return <FireEvents searchQuery={searchQuery} onSearchChange={setSearchQuery} />;
      case 'weather': return <Weather />;
      case 'emergency-response': return <EmergencyResponse />;
      case 'analytics': return <Analytics />;
      case 'data-sources': return <DataSources />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <MainDashboard
      activePage={page}
      onNavigate={setPage}
      onGoToLanding={() => setEntered(false)}
      searchQuery={searchQuery}
      onSearchChange={(q) => {
        setSearchQuery(q);
        if (page !== 'fire-events') setPage('fire-events');
      }}
      onSearchFocus={() => {
        if (page !== 'fire-events') setPage('fire-events');
      }}
    >
      <Suspense fallback={<PageLoader />}>
        {renderPage()}
      </Suspense>
    </MainDashboard>
  );
}
