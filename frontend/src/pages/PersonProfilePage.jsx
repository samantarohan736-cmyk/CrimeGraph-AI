import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  Truck, 
  MapPin, 
  Briefcase, 
  Network, 
  FileText, 
  ArrowLeft,
  Zap,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { getPersonDetails, getEntityEvidenceChain, createPhone, createVehicle } from '../services/api';
import PriorityScoreMeter from '../components/common/PriorityScoreMeter';
import AlertBadge from '../components/alerts/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function PersonProfilePage() {
  const { personId } = useParams();
  const [person, setPerson] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addPhoneOpen, setAddPhoneOpen] = useState(false);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [phoneForm, setPhoneForm] = useState({ phone_number: '', operator: '', is_burner: 'false' });
  const [vehicleForm, setVehicleForm] = useState({ license_plate: '', make: '', model: '', color: '' });
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [inlineToast, setInlineToast] = useState(null);
  const navigate = useNavigate();

  const showInlineToast = (t) => { setInlineToast(t); setTimeout(() => setInlineToast(null), 3500); };

  const handleAddPhone = async (e) => {
    e.preventDefault();
    if (!phoneForm.phone_number.trim()) return;
    setPhoneLoading(true);
    try {
      const res = await createPhone({ ...phoneForm, is_burner: phoneForm.is_burner === 'true', registered_owner: personId });
      showInlineToast({ type: 'success', message: res.message || 'Phone added!' });
      setPhoneForm({ phone_number: '', operator: '', is_burner: 'false' });
      setAddPhoneOpen(false);
      // Refresh person data
      const updated = await getPersonDetails(personId);
      setPerson(updated);
    } catch (err) {
      showInlineToast({ type: 'error', message: err.message || 'Failed to add phone.' });
    } finally { setPhoneLoading(false); }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleForm.license_plate.trim()) return;
    setVehicleLoading(true);
    try {
      const res = await createVehicle({ ...vehicleForm, registered_owner: personId });
      showInlineToast({ type: 'success', message: res.message || 'Vehicle added!' });
      setVehicleForm({ license_plate: '', make: '', model: '', color: '' });
      setAddVehicleOpen(false);
      const updated = await getPersonDetails(personId);
      setPerson(updated);
    } catch (err) {
      showInlineToast({ type: 'error', message: err.message || 'Failed to add vehicle.' });
    } finally { setVehicleLoading(false); }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pRes, evRes] = await Promise.all([
          getPersonDetails(personId),
          getEntityEvidenceChain(personId)
        ]);
        setPerson(pRes);
        setEvidenceList(evRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [personId]);

  if (loading) return <LoadingSpinner message={`Compiling intelligence dossier for ${personId}...`} />;
  if (!person) return <div className="p-8 text-center text-brutal-pink font-mono">Entity record not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto neo-cyber-bg min-h-screen font-mono transition-colors duration-250">
      {/* Back Button & Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/persons')}
          className="neo-btn px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] inline-flex items-center gap-2 text-xs font-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO PERSONS</span>
        </button>

        {/* Profile Card Banner */}
        <div className="p-6 neo-box-solid bg-brutal-lime flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-white text-black border-2 border-black flex items-center justify-center font-black text-2xl shadow-brutal-sm shrink-0 overflow-hidden">
              {(() => {
                const avatar = person.avatar_url || person.avatar || (person.properties && (person.properties.avatar_url || person.properties.avatar));
                if (avatar) {
                  return <img src={avatar} alt={person.name} className="w-full h-full object-cover" />;
                }
                return person.name.split(' ').map(n => n[0]).join('').slice(0, 2);
              })()}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="neo-badge bg-white text-black text-xs">
                  {person.person_id}
                </span>
                <span className="neo-badge bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs">
                  ALIASES: {person.aliases || 'None'}
                </span>
                <span className="neo-badge bg-brutal-pink text-black text-xs">
                  RISK: {person.risk_level}
                </span>
              </div>
              <h1 className="text-2xl font-black text-black uppercase font-sans">
                {person.name}
              </h1>
              <p className="text-xs text-black/80 font-sans font-bold">
                <strong>Role:</strong> {person.role || 'Syndicate Associate'} | <strong>Location:</strong> {person.primary_location} | <strong>Nationality:</strong> {person.nationality}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate(`/network?focus=${person.person_id}`)}
              className="neo-btn px-4 py-2.5 bg-brutal-yellow text-black font-black text-xs flex items-center gap-2"
            >
              <Network className="w-4 h-4 text-black" />
              <span>EXPLORE EGO GRAPH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Priority Breakdown vs Topological Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Priority Score Meter & Factors */}
        <div className="p-6 neo-box-tilt-l space-y-4 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
          <PriorityScoreMeter
            score={person.priority_score}
            factors={person.priority_factors}
            showFactors={true}
          />
        </div>

        {/* Middle Column: Why This Entity is Prioritized (Explainability Dossier) */}
        <div className="lg:col-span-2 p-6 neo-box-tilt-r space-y-5 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-brutal-yellow text-black border-2 border-[var(--border-color)]">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
                WHY THIS ENTITY IS ANALYTICALLY PRIORITIZED
              </h3>
            </div>
            <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
              EXPLAINABLE AI
            </span>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] space-y-3">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans font-medium">
              {person.priority_explanation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] space-y-1 shadow-[2px_2px_0_0_var(--shadow-color)]">
                <span className="text-[var(--text-secondary)] block text-[10px] font-black">BETWEENNESS</span>
                <span className="text-sm font-black text-brutal-cyan">{person.betweenness_centrality}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold block">Bridge Gateway</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] space-y-1 shadow-[2px_2px_0_0_var(--shadow-color)]">
                <span className="text-[var(--text-secondary)] block text-[10px] font-black">CASE OVERLAP</span>
                <span className="text-sm font-black text-brutal-pink">{person.associated_cases.length} Operations</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold block">Active Links</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] space-y-1 shadow-[2px_2px_0_0_var(--shadow-color)]">
                <span className="text-[var(--text-secondary)] block text-[10px] font-black">PAGERANK</span>
                <span className="text-sm font-black text-brutal-purple">{person.pagerank}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold block">Influence Rank</span>
              </div>
            </div>
          </div>

          {/* Active Anomaly Alerts for this person */}
          {person.active_alerts && person.active_alerts.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider block">
                TRIGGERED STATISTICAL ANOMALY ALERTS ({person.active_alerts.length})
              </span>
              <div className="space-y-2">
                {person.active_alerts.map((alt) => (
                  <div key={alt.alert_id} className="p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] text-xs flex items-start justify-between gap-4 shadow-[2px_2px_0_0_var(--shadow-color)]">
                    <div className="space-y-1 font-mono">
                      <div className="flex items-center gap-2">
                        <AlertBadge severity={alt.severity} />
                        <span className="font-black text-[var(--text-primary)]">{alt.alert_type}</span>
                      </div>
                      <p className="text-[var(--text-secondary)] font-sans font-medium">{alt.reason}</p>
                    </div>
                    {alt.supporting_evidence_id && (
                      <span className="neo-badge bg-brutal-cyan text-black text-[10px] shrink-0">
                        {alt.supporting_evidence_id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Modal Entity Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Associated Cases */}
        <div className="p-4 neo-box-tilt-l space-y-2 text-xs bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-black">
            <Briefcase className="w-4 h-4 text-[var(--text-primary)]" />
            <span>Associated Cases ({person.associated_cases.length})</span>
          </div>
          <div className="space-y-1.5">
            {person.associated_cases.map(c => (
              <div key={c.case_id} onClick={() => navigate(`/cases/${c.case_id}`)} className="p-2 rounded bg-[var(--bg-primary)] hover:bg-brutal-pink hover:text-black cursor-pointer transition-colors text-[var(--text-primary)] border-2 border-[var(--border-color)] font-black">
                {c.title}
              </div>
            ))}
          </div>
        </div>

        {/* Registered Phones */}
        <div className="p-4 neo-box-tilt-r space-y-2 text-xs bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-black">
              <Phone className="w-4 h-4 text-[var(--text-primary)]" />
              <span>Phone Endpoints ({person.phones.length})</span>
            </div>
            <button
              id="btn-add-phone"
              onClick={() => { setAddPhoneOpen(v => !v); setAddVehicleOpen(false); }}
              className="neo-btn px-2 py-1 bg-brutal-cyan text-black text-[10px] font-black flex items-center gap-1 hover:bg-brutal-lime transition-colors"
            >
              {addPhoneOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {addPhoneOpen ? 'CANCEL' : 'ADD'}
            </button>
          </div>
          <div className="space-y-1.5">
            {person.phones.map(ph => (
              <div key={ph.phone_id} className="p-2 rounded bg-[var(--bg-primary)] flex items-center justify-between text-[var(--text-primary)] border-2 border-[var(--border-color)]">
                <span className="font-black">{ph.number}</span>
                {ph.is_burner && <span className="neo-badge bg-brutal-pink text-black text-[9px]">BURNER</span>}
              </div>
            ))}
          </div>
          {/* Inline Add Phone Form */}
          {addPhoneOpen && (
            <form onSubmit={handleAddPhone} className="mt-3 space-y-2 p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-brutal-cyan">
              <p className="text-[10px] font-black text-brutal-cyan uppercase tracking-wider">New Phone Record</p>
              <input
                id="inline-ph-number"
                placeholder="Phone Number *"
                value={phoneForm.phone_number}
                onChange={e => setPhoneForm(f => ({ ...f, phone_number: e.target.value }))}
                required
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:border-brutal-cyan placeholder:text-[var(--text-secondary)]"
              />
              <input
                id="inline-ph-operator"
                placeholder="Operator (e.g. Airtel)"
                value={phoneForm.operator}
                onChange={e => setPhoneForm(f => ({ ...f, operator: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:border-brutal-cyan placeholder:text-[var(--text-secondary)]"
              />
              <select
                id="inline-ph-burner"
                value={phoneForm.is_burner}
                onChange={e => setPhoneForm(f => ({ ...f, is_burner: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:border-brutal-cyan"
              >
                <option value="false">Registered SIM</option>
                <option value="true">Burner / Unregistered</option>
              </select>
              <button id="inline-submit-phone" type="submit" disabled={phoneLoading}
                className="w-full neo-btn py-1.5 bg-brutal-cyan text-black font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-brutal-lime transition-colors disabled:opacity-60">
                {phoneLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {phoneLoading ? 'ADDING...' : 'ADD PHONE'}
              </button>
            </form>
          )}
        </div>

        {/* Vehicles */}
        <div className="p-4 neo-box-tilt-l space-y-2 text-xs bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-black">
              <Truck className="w-4 h-4 text-[var(--text-primary)]" />
              <span>Vehicles ({person.vehicles.length})</span>
            </div>
            <button
              id="btn-add-vehicle"
              onClick={() => { setAddVehicleOpen(v => !v); setAddPhoneOpen(false); }}
              className="neo-btn px-2 py-1 bg-brutal-yellow text-black text-[10px] font-black flex items-center gap-1 hover:bg-brutal-lime transition-colors"
            >
              {addVehicleOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {addVehicleOpen ? 'CANCEL' : 'ADD'}
            </button>
          </div>
          <div className="space-y-1.5">
            {person.vehicles.map(v => (
              <div key={v.vehicle_id} className="p-2 rounded bg-[var(--bg-primary)] text-[var(--text-primary)] border-2 border-[var(--border-color)]">
                <strong className="block text-[var(--text-primary)]">{v.plate_number}</strong>
                <span className="text-[11px] text-[var(--text-secondary)] font-bold">{v.make} {v.model}</span>
              </div>
            ))}
          </div>
          {/* Inline Add Vehicle Form */}
          {addVehicleOpen && (
            <form onSubmit={handleAddVehicle} className="mt-3 space-y-2 p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-brutal-yellow">
              <p className="text-[10px] font-black text-brutal-yellow uppercase tracking-wider">New Vehicle Record</p>
              <input
                id="inline-vh-plate"
                placeholder="License Plate *"
                value={vehicleForm.license_plate}
                onChange={e => setVehicleForm(f => ({ ...f, license_plate: e.target.value }))}
                required
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:border-brutal-yellow placeholder:text-[var(--text-secondary)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="inline-vh-make"
                  placeholder="Make (e.g. Toyota)"
                  value={vehicleForm.make}
                  onChange={e => setVehicleForm(f => ({ ...f, make: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:border-brutal-yellow placeholder:text-[var(--text-secondary)]"
                />
                <input
                  id="inline-vh-model"
                  placeholder="Model"
                  value={vehicleForm.model}
                  onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:border-brutal-yellow placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <input
                id="inline-vh-color"
                placeholder="Color"
                value={vehicleForm.color}
                onChange={e => setVehicleForm(f => ({ ...f, color: e.target.value }))}
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-md focus:outline-none focus:border-brutal-yellow placeholder:text-[var(--text-secondary)]"
              />
              <button id="inline-submit-vehicle" type="submit" disabled={vehicleLoading}
                className="w-full neo-btn py-1.5 bg-brutal-yellow text-black font-black text-[10px] flex items-center justify-center gap-1.5 hover:bg-brutal-lime transition-colors disabled:opacity-60">
                {vehicleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {vehicleLoading ? 'ADDING...' : 'ADD VEHICLE'}
              </button>
            </form>
          )}
        </div>

        {/* Locations */}
        <div className="p-4 neo-box-tilt-r space-y-2 text-xs bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-black">
            <MapPin className="w-4 h-4 text-[var(--text-primary)]" />
            <span>Key Locations ({person.locations.length})</span>
          </div>
          <div className="space-y-1.5">
            {person.locations.map(l => (
              <div key={l.location_id} className="p-2 rounded bg-[var(--bg-primary)] text-[var(--text-primary)] border-2 border-[var(--border-color)]">
                <strong className="block text-[var(--text-primary)]">{l.name}</strong>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold truncate block">{l.address}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audited Evidence Chain */}
      <div className="p-6 neo-box space-y-4 bg-[var(--bg-secondary)] border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-brutal-cyan text-black border-2 border-[var(--border-color)]">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
              AUDITED EVIDENCE RECORDS LINKED TO {person.name}
            </h3>
          </div>
          <span className="neo-badge bg-brutal-lime text-black text-[10px]">
            100% TRACEABLE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidenceList.map((ev) => (
            <div key={ev.evidence_id} className="p-4 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] space-y-2 text-xs shadow-[2px_2px_0_0_var(--shadow-color)]">
              <div className="flex items-start justify-between">
                <span className="neo-badge bg-brutal-cyan text-black text-[9px]">
                  {ev.evidence_id}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-black">{ev.evidence_type}</span>
              </div>
              <h4 className="font-black text-[var(--text-primary)] uppercase">{ev.title}</h4>
              <p className="text-[var(--text-secondary)] leading-relaxed text-[11px] font-sans font-medium">{ev.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inline Toast */}
      {inlineToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-[var(--border-color)] shadow-[4px_4px_0_0_var(--shadow-color)] font-mono font-black ${
          inlineToast.type === 'success' ? 'bg-brutal-lime text-black' : 'bg-brutal-pink text-black'
        }`}>
          <span className="text-xs">{inlineToast.message}</span>
        </div>
      )}
    </div>
  );
}
