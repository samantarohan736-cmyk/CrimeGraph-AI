import React, { useState } from "react";
import { X, Save, AlertCircle, Phone, Car, User, Plus, Trash2, CheckCircle, Loader2, MapPin } from "lucide-react";
import { createPerson, createPhone, createVehicle, createLocation, createRelationship } from "../../services/api";

const TABS = [
  { id: "person", label: "Person Info", icon: User },
  { id: "phones", label: "Phone Numbers", icon: Phone },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "location", label: "Location", icon: MapPin },
];

const INPUT_CLASS =
  "w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow transition-colors";
const LABEL_CLASS = "text-xs font-black uppercase text-[var(--text-secondary)]";

function emptyPhone() {
  return { phone_number: "", operator: "", imei: "", is_burner: false };
}
function emptyVehicle() {
  return { license_plate: "", make: "", model: "", color: "", year: "" };
}

export default function CreatePersonModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("person");
  const [personData, setPersonData] = useState({
    name: "",
    aliases: "",
    dob: "",
    role: "Syndicate Associate",
    nationality: "",
    primary_location: "",
    risk_level: "High",
    avatar_url: "",
  });
  const [phones, setPhones] = useState([emptyPhone()]);
  const [vehicles, setVehicles] = useState([emptyVehicle()]);
  const [locationData, setLocationData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    location_type: "",
  });
  const [addLocation, setAddLocation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const handlePersonChange = (e) => {
    const { name, value } = e.target;
    setPersonData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (idx, e) => {
    const { name, value, type, checked } = e.target;
    setPhones((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [name]: type === "checkbox" ? checked : value } : p))
    );
  };
  const addPhone = () => setPhones((prev) => [...prev, emptyPhone()]);
  const removePhone = (idx) => setPhones((prev) => prev.filter((_, i) => i !== idx));

  const handleVehicleChange = (idx, e) => {
    const { name, value } = e.target;
    setVehicles((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [name]: value } : v))
    );
  };
  const addVehicle = () => setVehicles((prev) => [...prev, emptyVehicle()]);
  const removeVehicle = (idx) => setVehicles((prev) => prev.filter((_, i) => i !== idx));

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!personData.name.trim()) {
      setError("Full Name is required.");
      setActiveTab("person");
      return;
    }
    setLoading(true);
    setError(null);
    setProgress([]);
    setDone(false);

    const log = (msg, ok = true) =>
      setProgress((prev) => [...prev, { msg, ok }]);

    try {
      log("Creating person profile...", true);
      const personRes = await createPerson(personData);
      const person_id = personRes.person_id;
      log(`Person created — ${person_id}`, true);

      const activePhones = phones.filter((p) => p.phone_number.trim());
      for (const ph of activePhones) {
        try {
          log(`Creating phone ${ph.phone_number}...`, true);
          const phRes = await createPhone({
            phone_number: ph.phone_number,
            operator: ph.operator || undefined,
            imei: ph.imei || undefined,
            is_burner: ph.is_burner,
          });
          const phone_id = phRes.phone_id;
          log(`Phone created — ${phone_id}`, true);
          await createRelationship({
            source_id: person_id,
            target_id: phone_id,
            relationship_type: "USES_PHONE",
            confidence: 1.0,
            notes: "Manually linked during person creation",
          });
          log(`Linked ${person_id} -> ${phone_id} (USES_PHONE)`, true);
        } catch (err) {
          log(`Phone ${ph.phone_number}: ${err.message}`, false);
        }
      }

      const activeVehicles = vehicles.filter((v) => v.license_plate.trim());
      for (const vh of activeVehicles) {
        try {
          log(`Creating vehicle ${vh.license_plate}...`, true);
          const vhRes = await createVehicle({
            license_plate: vh.license_plate,
            make: vh.make || undefined,
            model: vh.model || undefined,
            color: vh.color || undefined,
            year: vh.year ? parseInt(vh.year) : undefined,
            registered_owner: personData.name,
          });
          const vehicle_id = vhRes.vehicle_id;
          log(`Vehicle created — ${vehicle_id}`, true);
          await createRelationship({
            source_id: person_id,
            target_id: vehicle_id,
            relationship_type: "OWNS_VEHICLE",
            confidence: 1.0,
            notes: "Manually linked during person creation",
          });
          log(`Linked ${person_id} -> ${vehicle_id} (OWNS_VEHICLE)`, true);
        } catch (err) {
          log(`Vehicle ${vh.license_plate}: ${err.message}`, false);
        }
      }

      if (addLocation && locationData.name.trim()) {
        try {
          log(`Creating location "${locationData.name}"...`, true);
          const locRes = await createLocation({
            name: locationData.name,
            address: locationData.address || undefined,
            latitude: locationData.latitude ? parseFloat(locationData.latitude) : undefined,
            longitude: locationData.longitude ? parseFloat(locationData.longitude) : undefined,
            location_type: locationData.location_type || undefined,
          });
          const location_id = locRes.location_id;
          log(`Location created — ${location_id}`, true);
          await createRelationship({
            source_id: person_id,
            target_id: location_id,
            relationship_type: "LOCATED_AT",
            confidence: 1.0,
            notes: "Manually linked during person creation",
          });
          log(`Linked ${person_id} -> ${location_id} (LOCATED_AT)`, true);
        } catch (err) {
          log(`Location: ${err.message}`, false);
        }
      }

      setDone(true);
      setTimeout(() => {
        if(onSuccess) onSuccess();
        handleClose();
      }, 1800);
    } catch (err) {
      setError(err.message || "Failed to create person record");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab("person");
    setPersonData({ name: "", aliases: "", dob: "", role: "Syndicate Associate", nationality: "", primary_location: "", risk_level: "High", avatar_url: "" });
    setPhones([emptyPhone()]);
    setVehicles([emptyVehicle()]);
    setLocationData({ name: "", address: "", latitude: "", longitude: "", location_type: "" });
    setAddLocation(false);
    setProgress([]);
    setError(null);
    setDone(false);
    onClose();
  };

  const phoneFilled = phones.filter((p) => p.phone_number.trim()).length;
  const vehicleFilled = vehicles.filter((v) => v.license_plate.trim()).length;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="neo-box w-full max-w-2xl bg-[var(--bg-secondary)] flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b-3 border-[var(--border-color)] bg-brutal-lime flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black uppercase text-black">Create Person Profile</h2>
            <p className="text-[11px] text-black/70 font-bold mt-0.5">
              Fill tabs below — phones &amp; vehicles will be auto-linked in the graph
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-black/10 rounded transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b-2 border-[var(--border-color)] shrink-0 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const hasBadge =
              (id === "phones" && phoneFilled > 0) ||
              (id === "vehicles" && vehicleFilled > 0) ||
              (id === "location" && addLocation && locationData.name.trim());
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase border-r-2 border-[var(--border-color)] transition-all shrink-0 relative ${
                  isActive
                    ? "bg-brutal-yellow text-black"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {hasBadge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brutal-cyan border border-black" />
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-brutal-hotpink/10 border-2 border-brutal-hotpink text-brutal-hotpink text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(loading || done) && progress.length > 0 && (
            <div className="mx-6 mt-4 p-4 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] space-y-1.5">
              <p className="text-xs font-black uppercase mb-2 text-[var(--text-secondary)]">
                {done ? "All Done!" : "Submitting..."}
              </p>
              {progress.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs font-bold ${
                    step.ok ? "text-[var(--text-primary)]" : "text-brutal-hotpink"
                  }`}
                >
                  {step.ok ? (
                    <CheckCircle className="w-3.5 h-3.5 text-brutal-cyan shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>{step.msg}</span>
                </div>
              ))}
              {loading && <Loader2 className="w-4 h-4 animate-spin text-brutal-yellow mt-2" />}
            </div>
          )}

          <form id="create-person-form" onSubmit={handleSubmit}>

            {/* ===== PERSON INFO ===== */}
            {activeTab === "person" && (
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>Full Name *</label>
                  <input type="text" name="name" required placeholder="e.g. Ravi Kumar"
                    value={personData.name} onChange={handlePersonChange} className={INPUT_CLASS} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Aliases / AKA</label>
                    <input type="text" name="aliases" placeholder="Comma separated aliases"
                      value={personData.aliases} onChange={handlePersonChange} className={INPUT_CLASS} />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Date of Birth</label>
                    <input type="date" name="dob" value={personData.dob} onChange={handlePersonChange} className={INPUT_CLASS} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Primary Role</label>
                    <input type="text" name="role" placeholder="e.g. Courier, Financier"
                      value={personData.role} onChange={handlePersonChange} className={INPUT_CLASS} />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Risk Level</label>
                    <select name="risk_level" value={personData.risk_level} onChange={handlePersonChange} className={INPUT_CLASS}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Nationality</label>
                    <input type="text" name="nationality" placeholder="e.g. IND"
                      value={personData.nationality} onChange={handlePersonChange} className={INPUT_CLASS} />
                  </div>
                  <div className="space-y-1">
                    <label className={LABEL_CLASS}>Primary Location (text)</label>
                    <input type="text" name="primary_location" placeholder="e.g. Mumbai"
                      value={personData.primary_location} onChange={handlePersonChange} className={INPUT_CLASS} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={LABEL_CLASS}>Avatar URL</label>
                  <input type="text" name="avatar_url" placeholder="https://example.com/avatar.jpg"
                    value={personData.avatar_url} onChange={handlePersonChange} className={INPUT_CLASS} />
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="button" onClick={() => setActiveTab("phones")}
                    className="neo-btn px-4 py-2 bg-brutal-cyan text-black font-black text-xs">
                    NEXT: PHONE NUMBERS
                  </button>
                </div>
              </div>
            )}

            {/* ===== PHONES ===== */}
            {activeTab === "phones" && (
              <div className="p-6 space-y-5">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold">
                  Add phone numbers used by this person. Leave empty to skip. All phones will be auto-linked in the graph.
                </div>
                {phones.map((ph, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-brutal-cyan">Phone #{idx + 1}</span>
                      {phones.length > 1 && (
                        <button type="button" onClick={() => removePhone(idx)}
                          className="p-1 hover:text-brutal-hotpink transition-colors text-[var(--text-secondary)]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Phone Number</label>
                        <input type="text" name="phone_number" placeholder="+91 98765 43210"
                          value={ph.phone_number} onChange={(e) => handlePhoneChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Operator</label>
                        <input type="text" name="operator" placeholder="e.g. Airtel, Jio"
                          value={ph.operator} onChange={(e) => handlePhoneChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>IMEI (optional)</label>
                        <input type="text" name="imei" placeholder="e.g. 352099001761481"
                          value={ph.imei} onChange={(e) => handlePhoneChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                      <div className="flex items-center gap-3 pt-5">
                        <input type="checkbox" name="is_burner" id={`burner-${idx}`}
                          checked={ph.is_burner} onChange={(e) => handlePhoneChange(idx, e)}
                          className="w-4 h-4 accent-brutal-hotpink" />
                        <label htmlFor={`burner-${idx}`} className="text-xs font-black uppercase cursor-pointer">
                          Burner Phone
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addPhone}
                  className="w-full neo-btn py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-black text-xs flex items-center justify-center gap-2 border-dashed">
                  <Plus className="w-4 h-4" /> ADD ANOTHER PHONE
                </button>
                <div className="pt-2 flex justify-between">
                  <button type="button" onClick={() => setActiveTab("person")}
                    className="neo-btn px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-xs">
                    BACK
                  </button>
                  <button type="button" onClick={() => setActiveTab("vehicles")}
                    className="neo-btn px-4 py-2 bg-brutal-cyan text-black font-black text-xs">
                    NEXT: VEHICLES
                  </button>
                </div>
              </div>
            )}

            {/* ===== VEHICLES ===== */}
            {activeTab === "vehicles" && (
              <div className="p-6 space-y-5">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold">
                  Add vehicles associated with this person. License plate is required. Vehicles will be auto-linked in the graph.
                </div>
                {vehicles.map((vh, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-brutal-yellow">Vehicle #{idx + 1}</span>
                      {vehicles.length > 1 && (
                        <button type="button" onClick={() => removeVehicle(idx)}
                          className="p-1 hover:text-brutal-hotpink transition-colors text-[var(--text-secondary)]">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>License Plate *</label>
                        <input type="text" name="license_plate" placeholder="e.g. MH12AB3456"
                          value={vh.license_plate} onChange={(e) => handleVehicleChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Color</label>
                        <input type="text" name="color" placeholder="e.g. Black"
                          value={vh.color} onChange={(e) => handleVehicleChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Make</label>
                        <input type="text" name="make" placeholder="Toyota"
                          value={vh.make} onChange={(e) => handleVehicleChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Model</label>
                        <input type="text" name="model" placeholder="Fortuner"
                          value={vh.model} onChange={(e) => handleVehicleChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Year</label>
                        <input type="number" name="year" placeholder="2022"
                          value={vh.year} onChange={(e) => handleVehicleChange(idx, e)} className={INPUT_CLASS} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addVehicle}
                  className="w-full neo-btn py-2.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-black text-xs flex items-center justify-center gap-2 border-dashed">
                  <Plus className="w-4 h-4" /> ADD ANOTHER VEHICLE
                </button>
                <div className="pt-2 flex justify-between">
                  <button type="button" onClick={() => setActiveTab("phones")}
                    className="neo-btn px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-xs">
                    BACK
                  </button>
                  <button type="button" onClick={() => setActiveTab("location")}
                    className="neo-btn px-4 py-2 bg-brutal-cyan text-black font-black text-xs">
                    NEXT: LOCATION
                  </button>
                </div>
              </div>
            )}

            {/* ===== LOCATION ===== */}
            {activeTab === "location" && (
              <div className="p-6 space-y-5">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-bold">
                  Optionally create a full Location node in the graph (safe house, warehouse, meeting point etc.) and link it to this person.
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)]">
                  <input type="checkbox" id="add-location-toggle" checked={addLocation}
                    onChange={(e) => setAddLocation(e.target.checked)} className="w-4 h-4 accent-brutal-lime" />
                  <label htmlFor="add-location-toggle" className="text-xs font-black uppercase cursor-pointer">
                    Create and Link a Location Node
                  </label>
                </div>
                {addLocation && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Location Name *</label>
                      <input type="text" name="name" placeholder="e.g. Mumbai Safe House"
                        value={locationData.name} onChange={handleLocationChange} className={INPUT_CLASS} />
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Address</label>
                      <input type="text" name="address" placeholder="Full address"
                        value={locationData.address} onChange={handleLocationChange} className={INPUT_CLASS} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Latitude</label>
                        <input type="number" step="any" name="latitude" placeholder="19.0760"
                          value={locationData.latitude} onChange={handleLocationChange} className={INPUT_CLASS} />
                      </div>
                      <div className="space-y-1">
                        <label className={LABEL_CLASS}>Longitude</label>
                        <input type="number" step="any" name="longitude" placeholder="72.8777"
                          value={locationData.longitude} onChange={handleLocationChange} className={INPUT_CLASS} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={LABEL_CLASS}>Location Type</label>
                      <select name="location_type" value={locationData.location_type} onChange={handleLocationChange} className={INPUT_CLASS}>
                        <option value="">Select type...</option>
                        <option value="Residence">Residence</option>
                        <option value="Safe House">Safe House</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="Meeting Point">Meeting Point</option>
                        <option value="Business">Business</option>
                        <option value="Border Crossing">Border Crossing</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className="pt-2 flex justify-start">
                  <button type="button" onClick={() => setActiveTab("vehicles")}
                    className="neo-btn px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-xs">
                    BACK
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-3 border-[var(--border-color)] bg-[var(--bg-tertiary)] flex justify-between items-center gap-3 shrink-0 rounded-b-[9px]">
          <div className="flex items-center gap-2 flex-wrap">
            {phoneFilled > 0 && (
              <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                {phoneFilled} PHONE{phoneFilled > 1 ? "S" : ""}
              </span>
            )}
            {vehicleFilled > 0 && (
              <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
                {vehicleFilled} VEHICLE{vehicleFilled > 1 ? "S" : ""}
              </span>
            )}
            {addLocation && locationData.name.trim() && (
              <span className="neo-badge bg-brutal-lime text-black text-[10px]">
                LOCATION
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleClose}
              className="neo-btn px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-black text-xs">
              CANCEL
            </button>
            <button type="submit" form="create-person-form" disabled={loading || done}
              className="neo-btn px-5 py-2 bg-brutal-lime text-black font-black text-xs flex items-center gap-2 disabled:opacity-60">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> SAVING...</>
              ) : done ? (
                <><CheckCircle className="w-4 h-4" /> DONE!</>
              ) : (
                <><Save className="w-4 h-4" /> SAVE ALL</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
