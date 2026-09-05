import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { createCase } from '../../services/api';

export default function CreateCaseModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    case_type: 'Fraud',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    lead_officer: '',
    date_registered: '',
    incident_date: '',
    estimated_value: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimated_value' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createCase(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="neo-box w-full max-w-2xl bg-[var(--bg-secondary)] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b-3 border-[var(--border-color)] bg-brutal-pink flex items-center justify-between">
          <h2 className="text-lg font-black uppercase text-black">Create New Case Dossier</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/10 rounded"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-brutal-hotpink/10 border-2 border-brutal-hotpink text-brutal-hotpink text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="create-case-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Case Type *</label>
                <select 
                  name="case_type" 
                  required
                  value={formData.case_type} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                >
                  <option value="Fraud">Fraud</option>
                  <option value="Hawala">Hawala</option>
                  <option value="Smuggling">Smuggling</option>
                  <option value="Cyber">Cyber</option>
                  <option value="Narcotics">Narcotics</option>
                  <option value="Terrorism">Terrorism</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase">Case Title *</label>
              <input 
                type="text" 
                name="title" 
                required 
                placeholder="Operation Name..."
                value={formData.title} 
                onChange={handleChange}
                className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase">Description</label>
              <textarea 
                name="description" 
                rows={3}
                placeholder="Initial intelligence report..."
                value={formData.description} 
                onChange={handleChange}
                className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-xs font-black uppercase">Status</label>
                <select 
                  name="status" 
                  value={formData.status} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Priority</label>
                <select 
                  name="priority" 
                  value={formData.priority} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-xs font-black uppercase">Lead Officer</label>
                <input 
                  type="text" 
                  name="lead_officer" 
                  placeholder="e.g. Insp. Sharma"
                  value={formData.lead_officer} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Est. Value (INR)</label>
                <input 
                  type="number" 
                  name="estimated_value"
                  min="0"
                  value={formData.estimated_value} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Date Registered</label>
                <input 
                  type="date" 
                  name="date_registered"
                  value={formData.date_registered} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Incident Date</label>
                <input 
                  type="date" 
                  name="incident_date"
                  value={formData.incident_date} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-3 border-[var(--border-color)] bg-[var(--bg-tertiary)] flex justify-end gap-3 rounded-b-[9px]">
          <button 
            type="button"
            onClick={onClose}
            className="neo-btn px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-black text-xs"
          >
            CANCEL
          </button>
          <button 
            type="submit"
            form="create-case-form"
            disabled={loading}
            className="neo-btn px-4 py-2 bg-brutal-cyan text-black font-black text-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'SAVING...' : 'SAVE CASE'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
