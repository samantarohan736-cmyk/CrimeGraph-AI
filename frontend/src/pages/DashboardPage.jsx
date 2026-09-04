import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Users, 
  Network, 
  BellRing, 
  TrendingUp, 
  PieChart, 
  Sparkles
} from 'lucide-react';
import { getDashboardSummary } from '../services/api';
import StatCard from '../components/dashboard/StatCard';
import CrimeDistributionChart from '../components/dashboard/CrimeDistributionChart';
import ActivityTimelineChart from '../components/dashboard/ActivityTimelineChart';
import PriorityLeadsTable from '../components/dashboard/PriorityLeadsTable';
import RecentAlertsList from '../components/dashboard/RecentAlertsList';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getDashboardSummary();
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load intelligence dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Synthesizing knowledge graph metrics and investigation priorities..." />;
  if (error) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-brutal-pink text-sm font-mono font-bold">{error}</p>
      <button onClick={() => window.location.reload()} className="neo-btn px-4 py-2 bg-brutal-cyan text-black text-xs font-mono font-bold">RETRY</button>
    </div>
  );

  const m = data.metrics || {};

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen">
      {/* Top Banner Hero */}
      <div className="p-6 neo-box-solid bg-brutal-yellow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2 z-10 font-mono">
          <div className="flex items-center gap-2">
            <span className="neo-badge bg-black text-white text-[11px] font-black">
              TACTICAL INTEL OVERVIEW
            </span>
            <span className="neo-badge bg-white text-black text-[10px] uppercase">
              LIVE SYNCED GRAPH
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-black uppercase">
            Criminal Network Intelligence & Analytical Priority Dashboard
          </h1>
          <p className="text-xs text-slate-800 max-w-3xl leading-relaxed font-sans font-medium">
            Multi-modal graph intelligence synthesizing telecom CDR records, Hawala transactions, vehicle registries, and surveillance intelligence into explainable investigation leads.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => navigate('/assistant')}
            className="neo-btn px-4 py-2.5 bg-brutal-lime text-black text-xs font-black flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>AI ASSISTANT</span>
          </button>
          <button
            onClick={() => navigate('/network')}
            className="neo-btn px-4 py-2.5 bg-brutal-cyan text-black text-xs font-black flex items-center gap-2"
          >
            <Network className="w-4 h-4 text-black" />
            <span>EXPLORE GRAPH</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Cases"
          value={m.total_cases || 0}
          icon={Briefcase}
          color="rose"
          subtitle="Hawala, Contraband, Cyber Infiltrations"
          trend="+1 NEW"
          tilt="left"
        />
        <StatCard
          title="Entities of Interest"
          value={m.total_persons || 0}
          icon={Users}
          color="cyan"
          subtitle="Nodal coordinators, shell owners, brokers"
          trend="12 TRACKED"
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
          trend="7 ACTIVE"
          tilt="right"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crime Types */}
        <div className="p-5 neo-box bg-white space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-black font-black flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brutal-pink border border-black"></span>
              SYNDICATE CRIME CATEGORIZATION
            </span>
            <PieChart className="w-4 h-4 text-black dark:text-white" />
          </div>
          <CrimeDistributionChart data={data.crime_distribution} />
        </div>

        {/* Temporal Activity Trends */}
        <div className="lg:col-span-2 p-5 neo-box bg-white space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-black font-black flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brutal-cyan border border-black"></span>
              MONTHLY OPERATIONAL ACTIVITY (CDR VS FINANCIAL FLOWS)
            </span>
            <TrendingUp className="w-4 h-4 text-black dark:text-white" />
          </div>
          <ActivityTimelineChart data={data.activity_timeline} />
        </div>
      </div>

      {/* Bottom Row: Top Leads Table & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriorityLeadsTable leads={data.top_leads} />
        </div>

        <div className="lg:col-span-1">
          <RecentAlertsList alerts={data.recent_alerts} />
        </div>
      </div>
    </div>
  );
}
