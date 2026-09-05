import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Users, 
  Network, 
  BellRing, 
  TrendingUp, 
  PieChart, 
  Sparkles,
  Database
} from 'lucide-react';
import { getDashboardSummary } from '../services/api';
import StatCard from '../components/dashboard/StatCard';
import CrimeDistributionChart from '../components/dashboard/CrimeDistributionChart';
import ActivityTimelineChart from '../components/dashboard/ActivityTimelineChart';
import PriorityLeadsTable from '../components/dashboard/PriorityLeadsTable';
import RecentAlertsList from '../components/dashboard/RecentAlertsList';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DataUploadWidget from '../components/dashboard/DataUploadWidget';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDashboardSummary();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load intelligence dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner message="Synthesizing knowledge graph metrics and investigation priorities..." />;
  
  if (error) return (
    <div className="p-8 text-center space-y-4 neo-cyber-bg min-h-screen flex flex-col items-center justify-center">
      <div className="p-6 bg-brutal-hotpink/10 border-2 border-brutal-hotpink rounded-xl max-w-md w-full">
        <p className="text-brutal-hotpink text-sm font-mono font-bold mb-4">{error}</p>
        <button onClick={loadData} className="neo-btn px-4 py-2 bg-brutal-cyan text-black text-xs font-mono font-bold w-full">RETRY CONNECTION</button>
      </div>
    </div>
  );

  const m = data?.metrics || {};
  const isDbEmpty = m.total_cases === 0 && m.total_persons === 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen transition-colors duration-250">
      {/* Top Banner Hero */}
      <div className="p-5 md:p-6 neo-box bg-[var(--bg-secondary)] border-b-4 border-[var(--border-color)] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 transition-colors">
        <div className="space-y-2 z-10 font-mono text-[var(--text-primary)] w-full xl:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="neo-badge bg-[var(--bg-primary)] text-[var(--text-primary)] border-2 border-[var(--border-color)] text-[10px] md:text-[11px] font-black">
              TACTICAL INTEL OVERVIEW
            </span>
            <span className="neo-badge bg-brutal-pink text-black text-[9px] md:text-[10px] uppercase border-2 border-[var(--border-color)]">
              LIVE SYNCED GRAPH
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
            Criminal Network Intelligence & Analytical Priority Dashboard
          </h1>
          <p className="text-xs text-[var(--text-secondary)] max-w-3xl leading-relaxed font-sans font-medium">
            Multi-modal graph intelligence synthesizing telecom CDR records, Hawala transactions, vehicle registries, and surveillance intelligence into explainable investigation leads.
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 z-10 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 shrink-0">
          <button
            onClick={() => navigate('/assistant')}
            className="neo-btn px-3 py-2 md:px-4 md:py-2.5 bg-brutal-lime text-black border-2 border-[var(--border-color)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] text-xs font-black flex items-center gap-2 shrink-0 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI ASSISTANT</span>
          </button>
          <button
            onClick={() => navigate('/network')}
            className="neo-btn px-3 py-2 md:px-4 md:py-2.5 bg-brutal-cyan text-black border-2 border-[var(--border-color)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] text-xs font-black flex items-center gap-2 shrink-0 transition-colors"
          >
            <Network className="w-4 h-4" />
            <span>EXPLORE GRAPH</span>
          </button>
        </div>
      </div>

      {/* CSV Bulk Upload Widget */}
      <DataUploadWidget onUploadSuccess={loadData} />

      {isDbEmpty ? (
        <div className="flex flex-col items-center justify-center p-12 neo-box bg-[var(--bg-secondary)] border-dashed text-center">
          <Database className="w-16 h-16 text-[var(--text-secondary)] mb-4 opacity-50" />
          <h2 className="text-xl font-black mb-2 text-[var(--text-primary)]">Database is Empty</h2>
          <p className="text-sm text-[var(--text-secondary)] font-mono max-w-md mb-6">
            Upload CSV data using the widget above to initialize the knowledge graph.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Cases"
              value={m.total_cases || 0}
              icon={Briefcase}
              color="rose"
              subtitle="Hawala, Contraband, Cyber Infiltrations"
              trend={m.total_cases ? `${m.total_cases} ACTIVE` : "0 ACTIVE"}
              tilt="left"
            />
            <StatCard
              title="Entities of Interest"
              value={m.total_persons || 0}
              icon={Users}
              color="cyan"
              subtitle="Nodal coordinators, shell owners, brokers"
              trend={m.total_persons ? `${m.total_persons} TRACKED` : "0 TRACKED"}
              tilt="right"
            />
            <StatCard
              title="Knowledge Graph Nodes"
              value={m.total_nodes || 0}
              icon={Network}
              color="emerald"
              subtitle={`${m.total_relationships || 0} Verified relationship links`}
              trend="MULTI-MODAL"
              tilt="left"
            />
            <StatCard
              title="Statistical Anomaly Alerts"
              value={m.total_alerts || 0}
              icon={BellRing}
              color="amber"
              subtitle="CDR surges, Hawala spikes, off-hours activity"
              trend={m.total_alerts ? `${m.total_alerts} ACTIVE` : "0 ACTIVE"}
              tilt="right"
            />
          </div>

          {/* Analytics Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Crime Types */}
            <div className="p-5 neo-box bg-[var(--bg-secondary)] space-y-4 xl:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider font-black flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-brutal-pink border border-[var(--border-color)]"></span>
                  SYNDICATE CRIME CATEGORIZATION
                </span>
                <PieChart className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <CrimeDistributionChart data={data.crime_distribution} />
            </div>

            {/* Temporal Activity Trends */}
            <div className="p-5 neo-box bg-[var(--bg-secondary)] space-y-4 xl:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider font-black flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-brutal-cyan border border-[var(--border-color)]"></span>
                  MONTHLY OPERATIONAL ACTIVITY (CDR VS FINANCIAL FLOWS)
                </span>
                <TrendingUp className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
              <ActivityTimelineChart data={data.activity_timeline} />
            </div>
          </div>

          {/* Bottom Row: Top Leads Table, Active Alerts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PriorityLeadsTable leads={data.top_leads} />
            </div>
            
            <div className="xl:col-span-1 space-y-6">
              <RecentAlertsList alerts={data.recent_alerts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
