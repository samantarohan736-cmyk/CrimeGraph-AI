import React, { useState, useEffect } from 'react';
import { Phone, Truck, MapPin, CheckCircle, XCircle, Loader2, ChevronDown, Plus } from 'lucide-react';
import { createPhone, createVehicle, createLocation, getPhones, getVehicles, getLocations } from '../services/api';

function Field({ label, id, required, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[10px] font-black font-mono uppercase tracking-widest text-[var(--text-secondary)]">
        {label}{required && <span className="text-brutal-pink ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ id, ...props }) {
  return (
    <input
      id={id}
      {...props}
      className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-primary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-brutal-cyan focus:shadow-[0_0_0_2px_rgba(0,255,255,0.15)] transition-all placeholder:text-[var(--text-secondary)] font-medium"
    />
  );
}

function SelectField({ id, children, ...props }) {
  return (
    <div className="relative">
      <select
        id={id}
        {...props}
        className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-primary)] border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:outline-none focus:border-brutal-cyan appearance-none transition-all"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)] pointer-events-none" />
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 border-[var(--border-color)] shadow-[4px_4px_0_0_var(--shadow-color)] font-mono font-black ${
      toast.type === 'success' ? 'bg-brutal-lime text-black' : 'bg-brutal-pink text-black'
    }`}>
      {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      <span className="text-xs">{toast.message}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color, onAddClick, showForm }) {
  return (
    <div className={`p-5 rounded-xl ${color} border-2 border-[var(--border-color)] shadow-[3px_3px_0_0_var(--shadow-color)] flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-white/20 border-2 border-black/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-black" />
        </div>
        <div>
          <h2 className="text-sm font-black font-mono uppercase tracking-wider text-black">{title}</h2>
          <p className="text-[11px] font-sans font-bold text-black/70">{subtitle}</p>
        </div>
      </div>
      <button 
        onClick={onAddClick}
        className="neo-btn px-4 py-2 bg-black text-white text-xs font-black flex items-center gap-2 shrink-0 border-2 border-transparent hover:bg-white hover:text-black hover:border-black transition-colors"
      >
        <Plus className={`w-4 h-4 transition-transform ${showForm ? 'rotate-45' : ''}`} />
        <span className="hidden sm:inline">{showForm ? 'CANCEL' : 'ADD RECORD'}</span>
      </button>
    </div>
  );
}

function PhoneForm({ onToast }) {
  const [form, setForm] = useState({ phone_number: '', imei: '', imsi: '', telecom_circle: '', operator: '', registered_owner: '', is_burner: 'false' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone_number.trim()) return;
    setLoading(true);
    try {
      const res = await createPhone({ ...form, is_burner: form.is_burner === 'true' });
      onToast({ type: 'success', message: res.message || `Phone ${res.phone_id} created!` });
      setForm({ phone_number: '', imei: '', imsi: '', telecom_circle: '', operator: '', registered_owner: '', is_burner: 'false' });
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Failed to create phone record.' });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone Number" id="ph-number" required>
          <Input id="ph-number" placeholder="+91-9876543210" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} required />
        </Field>
        <Field label="Registered Owner (Person ID or Name)" id="ph-owner">
          <Input id="ph-owner" placeholder="e.g. P001 or Rahul Sharma" value={form.registered_owner} onChange={e => set('registered_owner', e.target.value)} />
        </Field>
        <Field label="Operator / Network" id="ph-operator">
          <Input id="ph-operator" placeholder="e.g. Airtel, Jio, Vodafone" value={form.operator} onChange={e => set('operator', e.target.value)} />
        </Field>
        <Field label="Telecom Circle" id="ph-circle">
          <Input id="ph-circle" placeholder="e.g. Mumbai, Delhi" value={form.telecom_circle} onChange={e => set('telecom_circle', e.target.value)} />
        </Field>
        <Field label="IMEI" id="ph-imei">
          <Input id="ph-imei" placeholder="15-digit IMEI number" value={form.imei} onChange={e => set('imei', e.target.value)} />
        </Field>
        <Field label="IMSI" id="ph-imsi">
          <Input id="ph-imsi" placeholder="International Mobile Subscriber Identity" value={form.imsi} onChange={e => set('imsi', e.target.value)} />
        </Field>
        <Field label="SIM Type" id="ph-burner">
          <SelectField id="ph-burner" value={form.is_burner} onChange={e => set('is_burner', e.target.value)}>
            <option value="false">Registered SIM</option>
            <option value="true">Burner / Unregistered</option>
          </SelectField>
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <button id="submit-phone" type="submit" disabled={loading}
          className="neo-btn px-6 py-2.5 bg-brutal-cyan text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-brutal-lime transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
          {loading ? 'REGISTERING...' : 'ADD PHONE RECORD'}
        </button>
      </div>
    </form>
  );
}

function VehicleForm({ onToast }) {
  const [form, setForm] = useState({ license_plate: '', make: '', model: '', color: '', year: '', registered_owner: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.license_plate.trim()) return;
    setLoading(true);
    try {
      const res = await createVehicle({ ...form, year: form.year ? parseInt(form.year) : undefined });
      onToast({ type: 'success', message: res.message || `Vehicle ${res.vehicle_id} created!` });
      setForm({ license_plate: '', make: '', model: '', color: '', year: '', registered_owner: '', notes: '' });
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Failed to create vehicle record.' });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="License Plate" id="vh-plate" required>
          <Input id="vh-plate" placeholder="e.g. MH-04-AX-1234" value={form.license_plate} onChange={e => set('license_plate', e.target.value)} required />
        </Field>
        <Field label="Registered Owner (Person ID or Name)" id="vh-owner">
          <Input id="vh-owner" placeholder="e.g. P003 or Tariq Khan" value={form.registered_owner} onChange={e => set('registered_owner', e.target.value)} />
        </Field>
        <Field label="Make / Brand" id="vh-make">
          <Input id="vh-make" placeholder="e.g. Toyota, Ford, Tata" value={form.make} onChange={e => set('make', e.target.value)} />
        </Field>
        <Field label="Model" id="vh-model">
          <Input id="vh-model" placeholder="e.g. Fortuner, Innova, Pickup" value={form.model} onChange={e => set('model', e.target.value)} />
        </Field>
        <Field label="Color" id="vh-color">
          <Input id="vh-color" placeholder="e.g. Black, White, Grey" value={form.color} onChange={e => set('color', e.target.value)} />
        </Field>
        <Field label="Year of Manufacture" id="vh-year">
          <Input id="vh-year" type="number" placeholder="e.g. 2021" min="1990" max="2030" value={form.year} onChange={e => set('year', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes / Remarks" id="vh-notes">
            <Input id="vh-notes" placeholder="e.g. Spotted near JNPT Port on 2024-03-15" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button id="submit-vehicle" type="submit" disabled={loading}
          className="neo-btn px-6 py-2.5 bg-brutal-yellow text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-brutal-lime transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
          {loading ? 'REGISTERING...' : 'ADD VEHICLE RECORD'}
        </button>
      </div>
    </form>
  );
}

function LocationForm({ onToast }) {
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', location_type: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await createLocation({
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined
      });
      onToast({ type: 'success', message: res.message || `Location ${res.location_id} created!` });
      setForm({ name: '', address: '', latitude: '', longitude: '', location_type: '' });
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Failed to create location record.' });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Location Name" id="loc-name" required>
          <Input id="loc-name" placeholder="e.g. JNPT Port Warehouse" value={form.name} onChange={e => set('name', e.target.value)} required />
        </Field>
        <Field label="Location Type" id="loc-type">
          <SelectField id="loc-type" value={form.location_type} onChange={e => set('location_type', e.target.value)}>
            <option value="">Select Type</option>
            <option>Warehouse</option>
            <option>Residence</option>
            <option>Meeting Point</option>
            <option>Port / Border</option>
            <option>Office / Commercial</option>
            <option>Transit Hub</option>
            <option>Drop Point</option>
            <option>Safe House</option>
            <option>Other</option>
          </SelectField>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Full Address" id="loc-address">
            <Input id="loc-address" placeholder="Street, City, State, Country" value={form.address} onChange={e => set('address', e.target.value)} />
          </Field>
        </div>
        <Field label="Latitude" id="loc-lat">
          <Input id="loc-lat" type="number" step="any" placeholder="e.g. 18.9548" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
        </Field>
        <Field label="Longitude" id="loc-lon">
          <Input id="loc-lon" type="number" step="any" placeholder="e.g. 72.9354" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <button id="submit-location" type="submit" disabled={loading}
          className="neo-btn px-6 py-2.5 bg-brutal-purple text-white font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-brutal-pink hover:text-black transition-colors disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {loading ? 'PINNING...' : 'ADD LOCATION RECORD'}
        </button>
      </div>
    </form>
  );
}

export default function DataEntryPage() {
  const [toast, setToast] = useState(null);
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(null), 4000); };

  const [phones, setPhones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);

  const [loadingPhones, setLoadingPhones] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const loadData = async () => {
    try {
      setLoadingPhones(true);
      const p = await getPhones();
      setPhones(p);
    } catch (e) {} finally { setLoadingPhones(false); }

    try {
      setLoadingVehicles(true);
      const v = await getVehicles();
      setVehicles(v);
    } catch (e) {} finally { setLoadingVehicles(false); }

    try {
      setLoadingLocations(true);
      const l = await getLocations();
      setLocations(l);
    } catch (e) {} finally { setLoadingLocations(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handlePhoneSuccess = (t) => { showToast(t); setShowPhoneForm(false); loadData(); };
  const handleVehicleSuccess = (t) => { showToast(t); setShowVehicleForm(false); loadData(); };
  const handleLocationSuccess = (t) => { showToast(t); setShowLocationForm(false); loadData(); };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-[1200px] mx-auto neo-cyber-bg min-h-screen font-mono transition-colors duration-250">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="neo-badge bg-brutal-orange text-black text-[10px]">INTEL REGISTRY</span>
          <span className="neo-badge bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px]">DATA ENTRY MODULE</span>
        </div>
        <h1 className="text-2xl font-black font-sans uppercase tracking-wider text-[var(--text-primary)]">
          Entity Registry
        </h1>
        <p className="text-xs text-[var(--text-secondary)] font-sans font-medium leading-relaxed">
          Manage and register phone numbers, vehicles, and operational locations in the knowledge graph.
        </p>
      </div>

      <section id="section-phones" className="space-y-4">
        <SectionHeader icon={Phone} title="Phone Number Registry" subtitle="SIM cards, burner phones, telecom endpoints" color="bg-brutal-cyan" showForm={showPhoneForm} onAddClick={() => setShowPhoneForm(!showPhoneForm)} />
        {showPhoneForm && (
          <div className="p-6 neo-box bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
            <PhoneForm onToast={handlePhoneSuccess} />
          </div>
        )}
        <div className="neo-box bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-[var(--text-primary)]">
            <thead className="bg-[var(--bg-tertiary)] uppercase text-[10px] tracking-wider text-[var(--text-secondary)]">
              <tr><th className="p-3 border-b-2 border-[var(--border-color)]">Phone ID</th><th className="p-3 border-b-2 border-[var(--border-color)]">Number</th><th className="p-3 border-b-2 border-[var(--border-color)]">Owner</th><th className="p-3 border-b-2 border-[var(--border-color)]">Type</th></tr>
            </thead>
            <tbody>
              {loadingPhones ? <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr> : phones.length === 0 ? <tr><td colSpan="4" className="p-4 text-center">No records found.</td></tr> : phones.map(p => (
                <tr key={p.phone_id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="p-3 font-bold">{p.phone_id}</td>
                  <td className="p-3">{p.phone_number}</td>
                  <td className="p-3">{p.registered_owner || '-'}</td>
                  <td className="p-3">
                    {p.is_burner ? <span className="neo-badge bg-brutal-pink text-black text-[9px]">BURNER</span> : <span className="neo-badge bg-brutal-lime text-black text-[9px]">REGULAR</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="section-vehicles" className="space-y-4">
        <SectionHeader icon={Truck} title="Vehicle Registry" subtitle="Vehicles, license plates, transport assets" color="bg-brutal-yellow" showForm={showVehicleForm} onAddClick={() => setShowVehicleForm(!showVehicleForm)} />
        {showVehicleForm && (
          <div className="p-6 neo-box bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
            <VehicleForm onToast={handleVehicleSuccess} />
          </div>
        )}
        <div className="neo-box bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-[var(--text-primary)]">
            <thead className="bg-[var(--bg-tertiary)] uppercase text-[10px] tracking-wider text-[var(--text-secondary)]">
              <tr><th className="p-3 border-b-2 border-[var(--border-color)]">Vehicle ID</th><th className="p-3 border-b-2 border-[var(--border-color)]">Plate</th><th className="p-3 border-b-2 border-[var(--border-color)]">Make/Model</th><th className="p-3 border-b-2 border-[var(--border-color)]">Owner</th></tr>
            </thead>
            <tbody>
              {loadingVehicles ? <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr> : vehicles.length === 0 ? <tr><td colSpan="4" className="p-4 text-center">No records found.</td></tr> : vehicles.map(v => (
                <tr key={v.vehicle_id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="p-3 font-bold">{v.vehicle_id}</td>
                  <td className="p-3">{v.plate_number}</td>
                  <td className="p-3">{v.make_model || '-'}</td>
                  <td className="p-3">{v.registered_owner || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="section-locations" className="space-y-4">
        <SectionHeader icon={MapPin} title="Location Registry" subtitle="Warehouses, safe houses, meeting points" color="bg-brutal-purple" showForm={showLocationForm} onAddClick={() => setShowLocationForm(!showLocationForm)} />
        {showLocationForm && (
          <div className="p-6 neo-box bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]">
            <LocationForm onToast={handleLocationSuccess} />
          </div>
        )}
        <div className="neo-box bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-[var(--text-primary)]">
            <thead className="bg-[var(--bg-tertiary)] uppercase text-[10px] tracking-wider text-[var(--text-secondary)]">
              <tr><th className="p-3 border-b-2 border-[var(--border-color)]">Location ID</th><th className="p-3 border-b-2 border-[var(--border-color)]">Name</th><th className="p-3 border-b-2 border-[var(--border-color)]">Type</th><th className="p-3 border-b-2 border-[var(--border-color)]">Address</th></tr>
            </thead>
            <tbody>
              {loadingLocations ? <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr> : locations.length === 0 ? <tr><td colSpan="4" className="p-4 text-center">No records found.</td></tr> : locations.map(l => (
                <tr key={l.location_id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="p-3 font-bold">{l.location_id}</td>
                  <td className="p-3">{l.name}</td>
                  <td className="p-3">{l.location_type || '-'}</td>
                  <td className="p-3 truncate max-w-[200px]">{l.address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Toast toast={toast} />
    </div>
  );
}

