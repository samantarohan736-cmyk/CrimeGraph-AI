import React, { useState, useEffect } from 'react';
import { Plus, Phone, Truck, MapPin, Loader2 } from 'lucide-react';
import { createPhone, createVehicle, createLocation, getPhones, getVehicles, getLocations } from '../../services/api';

function Field({ label, id, required, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[10px] font-black uppercase text-[var(--text-secondary)]">
        {label} {required && <span className="text-brutal-orange">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-[var(--bg-primary)] border-[3px] border-black text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-brutal-cyan shadow-[4px_4px_0_0_#000] transition-colors ${props.className || ''}`}
    />
  );
}

function SelectField(props) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-[var(--bg-primary)] border-[3px] border-black text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-brutal-cyan shadow-[4px_4px_0_0_#000] appearance-none cursor-pointer transition-colors ${props.className || ''}`}
    >
      {props.children}
    </select>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color, onAddClick, showForm }) {
  return (
    <div className={`p-5 bg-[var(--bg-secondary)] border-[3px] border-black shadow-[6px_6px_0_0_#000] flex items-center justify-between gap-4 transition-all duration-200`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${color} border-[3px] border-black flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_#000]`}>
          <Icon className="w-6 h-6 text-black" />
        </div>
        <div>
          <h2 className="text-sm font-black font-mono uppercase tracking-wider text-[var(--text-primary)]">{title}</h2>
          <p className="text-[11px] font-sans font-bold text-[var(--text-secondary)]">{subtitle}</p>
        </div>
      </div>
      <button 
        onClick={onAddClick}
        className="neo-btn px-4 py-2 bg-black text-white text-xs font-black flex items-center gap-2 shrink-0 hover:bg-brutal-cyan hover:text-black transition-colors"
      >
        <Plus className={`w-4 h-4 transition-transform ${showForm ? 'rotate-45' : ''}`} />
        <span className="hidden sm:inline">{showForm ? 'CANCEL' : 'ADD RECORD'}</span>
      </button>
    </div>
  );
}

function PhoneForm({ onToast, onAdded }) {
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
      if (onAdded) onAdded();
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Failed to create phone record.' });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-[var(--bg-tertiary)] border-[3px] border-black shadow-[6px_6px_0_0_#000] mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone Number" id="ph-number" required>
          <Input id="ph-number" placeholder="+91-9876543210" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} required />
        </Field>
        <Field label="Registered Owner" id="ph-owner">
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
        <Field label="SIM Type" id="ph-burner">
          <SelectField id="ph-burner" value={form.is_burner} onChange={e => set('is_burner', e.target.value)}>
            <option value="false">Registered SIM</option>
            <option value="true">Burner / Unregistered</option>
          </SelectField>
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading}
          className="neo-btn px-6 py-2.5 bg-brutal-cyan text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-brutal-lime transition-colors disabled:opacity-60 border-[3px] border-black shadow-[4px_4px_0_0_#000]">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
          {loading ? 'REGISTERING...' : 'ADD PHONE RECORD'}
        </button>
      </div>
    </form>
  );
}

function VehicleForm({ onToast, onAdded }) {
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
      if (onAdded) onAdded();
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Failed to create vehicle record.' });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-[var(--bg-tertiary)] border-[3px] border-black shadow-[6px_6px_0_0_#000] mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="License Plate" id="vh-plate" required>
          <Input id="vh-plate" placeholder="e.g. MH-04-AX-1234" value={form.license_plate} onChange={e => set('license_plate', e.target.value)} required />
        </Field>
        <Field label="Registered Owner" id="vh-owner">
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
        <button type="submit" disabled={loading}
          className="neo-btn px-6 py-2.5 bg-brutal-yellow text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-brutal-lime transition-colors disabled:opacity-60 border-[3px] border-black shadow-[4px_4px_0_0_#000]">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
          {loading ? 'REGISTERING...' : 'ADD VEHICLE RECORD'}
        </button>
      </div>
    </form>
  );
}

function LocationForm({ onToast, onAdded }) {
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', location_type: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.latitude) payload.latitude = parseFloat(payload.latitude);
      if (payload.longitude) payload.longitude = parseFloat(payload.longitude);
      const res = await createLocation(payload);
      onToast({ type: 'success', message: res.message || `Location ${res.location_id} created!` });
      setForm({ name: '', address: '', latitude: '', longitude: '', location_type: '' });
      if (onAdded) onAdded();
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Failed to create location record.' });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 bg-[var(--bg-tertiary)] border-[3px] border-black shadow-[6px_6px_0_0_#000] mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Location Name" id="loc-name" required>
          <Input id="loc-name" placeholder="e.g. Safehouse A" value={form.name} onChange={e => set('name', e.target.value)} required />
        </Field>
        <Field label="Location Type" id="loc-type">
          <Input id="loc-type" placeholder="e.g. Warehouse, Residence, Port" value={form.location_type} onChange={e => set('location_type', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Full Address" id="loc-address">
            <Input id="loc-address" placeholder="e.g. 123 Dockyard Rd, Mumbai" value={form.address} onChange={e => set('address', e.target.value)} />
          </Field>
        </div>
        <Field label="Latitude" id="loc-lat">
          <Input id="loc-lat" type="number" step="any" placeholder="e.g. 18.9667" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
        </Field>
        <Field label="Longitude" id="loc-lng">
          <Input id="loc-lng" type="number" step="any" placeholder="e.g. 72.8333" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading}
          className="neo-btn px-6 py-2.5 bg-brutal-pink text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 hover:bg-brutal-lime transition-colors disabled:opacity-60 border-[3px] border-black shadow-[4px_4px_0_0_#000]">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {loading ? 'REGISTERING...' : 'ADD LOCATION RECORD'}
        </button>
      </div>
    </form>
  );
}

export default function StandaloneRegistries({ onToast }) {
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);

  const [phones, setPhones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);

  const fetchRegistries = async () => {
    try {
      const [pRes, vRes, lRes] = await Promise.all([
        getPhones().catch(() => []),
        getVehicles().catch(() => []),
        getLocations().catch(() => [])
      ]);
      setPhones(Array.isArray(pRes) ? pRes : (pRes?.phones || []));
      setVehicles(Array.isArray(vRes) ? vRes : (vRes?.vehicles || []));
      setLocations(Array.isArray(lRes) ? lRes : (lRes?.locations || []));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRegistries();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Phones Section */}
      <div className="flex flex-col">
        <SectionHeader 
          icon={Phone} title="Phone Directory" subtitle={`${phones.length} devices logged`}
          color="bg-brutal-cyan"
          onAddClick={() => setShowPhoneForm(!showPhoneForm)} showForm={showPhoneForm}
        />
        {showPhoneForm && <PhoneForm onToast={onToast} onAdded={fetchRegistries} />}
        {phones.length > 0 && !showPhoneForm && (
          <div className="mt-4 border-[3px] border-black shadow-[6px_6px_0_0_#000] bg-[var(--bg-primary)] overflow-hidden flex-1 max-h-[400px] overflow-y-auto">
            <table className="w-full text-[10px] font-mono">
              <thead className="bg-brutal-cyan border-b-[3px] border-black text-black sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-black">Number / Owner</th>
                  <th className="px-3 py-2 text-right font-black">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {phones.map(p => (
                  <tr key={p.phone_id} className="hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)]">
                    <td className="px-3 py-2">
                      <div className="font-bold text-xs">{p.phone_number}</div>
                      <div className="text-[var(--text-secondary)]">{p.registered_owner || p.operator || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 border-[2px] border-black font-black text-[9px] shadow-[2px_2px_0_0_#000] ${p.is_burner ? 'bg-brutal-pink text-black' : 'bg-brutal-lime text-black'}`}>
                        {p.is_burner ? 'BURNER' : 'REGISTERED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicles Section */}
      <div className="flex flex-col">
        <SectionHeader 
          icon={Truck} title="Vehicle Registry" subtitle={`${vehicles.length} vehicles logged`}
          color="bg-brutal-yellow"
          onAddClick={() => setShowVehicleForm(!showVehicleForm)} showForm={showVehicleForm}
        />
        {showVehicleForm && <VehicleForm onToast={onToast} onAdded={fetchRegistries} />}
        {vehicles.length > 0 && !showVehicleForm && (
          <div className="mt-4 border-[3px] border-black shadow-[6px_6px_0_0_#000] bg-[var(--bg-primary)] overflow-hidden flex-1 max-h-[400px] overflow-y-auto">
            <table className="w-full text-[10px] font-mono">
              <thead className="bg-brutal-yellow border-b-[3px] border-black text-black sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-black">Plate / Make</th>
                  <th className="px-3 py-2 text-right font-black">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {vehicles.map(v => (
                  <tr key={v.vehicle_id} className="hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)]">
                    <td className="px-3 py-2">
                      <div className="font-bold text-xs">{v.license_plate}</div>
                      <div className="text-[var(--text-secondary)]">{v.make} {v.model}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{v.registered_owner || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Locations Section */}
      <div className="flex flex-col">
        <SectionHeader 
          icon={MapPin} title="Locations Registry" subtitle={`${locations.length} locations logged`}
          color="bg-brutal-pink"
          onAddClick={() => setShowLocationForm(!showLocationForm)} showForm={showLocationForm}
        />
        {showLocationForm && <LocationForm onToast={onToast} onAdded={fetchRegistries} />}
        {locations.length > 0 && !showLocationForm && (
          <div className="mt-4 border-[3px] border-black shadow-[6px_6px_0_0_#000] bg-[var(--bg-primary)] overflow-hidden flex-1 max-h-[400px] overflow-y-auto">
            <table className="w-full text-[10px] font-mono">
              <thead className="bg-brutal-pink border-b-[3px] border-black text-black sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-black">Name / Type</th>
                  <th className="px-3 py-2 text-right font-black">Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {locations.map(l => (
                  <tr key={l.location_id} className="hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-primary)]">
                    <td className="px-3 py-2">
                      <div className="font-bold text-xs">{l.name}</div>
                      <div className="text-[var(--text-secondary)]">{l.location_type || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                      {l.latitude && l.longitude ? `${l.latitude}, ${l.longitude}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
