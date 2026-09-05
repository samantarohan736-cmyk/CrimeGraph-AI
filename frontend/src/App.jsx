import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

import DashboardPage from './pages/DashboardPage';
import NetworkAnalysisPage from './pages/NetworkAnalysisPage';
import CasesPage from './pages/CasesPage';
import CaseDetailsPage from './pages/CaseDetailsPage';
import PersonsPage from './pages/PersonsPage';
import PersonProfilePage from './pages/PersonProfilePage';
import AlertsPage from './pages/AlertsPage';
import DocumentsPage from './pages/DocumentsPage';
import InvestigationAssistantPage from './pages/InvestigationAssistantPage';

import { ThemeProvider } from './utils/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0B0F19] text-black dark:text-slate-100 flex flex-col selection:bg-brutal-yellow selection:text-black">

          {/* Top Navbar with Global Search */}
          <Navbar />

          {/* Main Body with Sidebar + Routed Content */}
          <div className="flex-1 flex overflow-hidden bg-[#FDFBF7] dark:bg-[#0B0F19]">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-[#FDFBF7] dark:bg-[#0B0F19]">
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
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
