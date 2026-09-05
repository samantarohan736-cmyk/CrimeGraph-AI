import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import { ThemeProvider } from './contexts/ThemeContext';

import DashboardPage from './pages/DashboardPage';
import NetworkAnalysisPage from './pages/NetworkAnalysisPage';
import CasesPage from './pages/CasesPage';
import CaseDetailsPage from './pages/CaseDetailsPage';
import PersonsPage from './pages/PersonsPage';
import PersonProfilePage from './pages/PersonProfilePage';
import AlertsPage from './pages/AlertsPage';
import DocumentsPage from './pages/DocumentsPage';
import InvestigationAssistantPage from './pages/InvestigationAssistantPage';
import DataEntryPage from './pages/DataEntryPage';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col selection:bg-brutal-yellow selection:text-black transition-colors duration-250">
          
          {/* Top Navbar with Global Search */}
          <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          {/* Main Body with Sidebar + Routed Content */}
          <div className="flex-1 flex overflow-hidden">
            <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/network" element={<NetworkAnalysisPage />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/cases/:caseId" element={<CaseDetailsPage />} />
                <Route path="/persons" element={<PersonsPage />} />
                <Route path="/persons/:personId" element={<PersonProfilePage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/assistant" element={<InvestigationAssistantPage />} />
                <Route path="/data-entry" element={<DataEntryPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
