import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { createPerson } from '../../services/api';

export default function CreatePersonModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    aliases: '',
    dob: '',
    role: 'Syndicate Associate',
    nationality: '',
    primary_location: '',
    risk_level: 'High',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createPerson(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create person record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="neo-box w-full max-w-xl bg-[var(--bg-secondary)] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b-3 border-[var(--border-color)] bg-brutal-lime flex items-center justify-between">
          <h2 className="text-lg font-black uppercase text-black">Create Person Profile</h2>
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

          <form id="create-person-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Full Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  placeholder="e.g. John Doe"
                  value={formData.name} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Aliases / AKA</label>
                <input 
                  type="text" 
                  name="aliases" 
                  placeholder="Comma separated aliases..."
                  value={formData.aliases} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Date of Birth</label>
                <input 
                  type="date" 
                  name="dob" 
                  value={formData.dob} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Primary Role</label>
                <input 
                  type="text" 
                  name="role" 
                  placeholder="e.g. Courier, Financier"
                  value={formData.role} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Risk Level</label>
                <select 
                  name="risk_level" 
                  value={formData.risk_level} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                >
                  <option value="Low" className="bg-[var(--bg-primary)]">Low</option>
                  <option value="Medium" className="bg-[var(--bg-primary)]">Medium</option>
                  <option value="High" className="bg-[var(--bg-primary)]">High</option>
                  <option value="Critical" className="bg-[var(--bg-primary)]">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Nationality</label>
                <input 
                  type="text" 
                  name="nationality" 
                  placeholder="e.g. IND"
                  value={formData.nationality} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase">Primary Location</label>
                <input 
                  type="text" 
                  name="primary_location" 
                  placeholder="e.g. Mumbai"
                  value={formData.primary_location} 
                  onChange={handleChange}
                  className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase">Avatar URL</label>
              <input 
                type="text" 
                name="avatar_url" 
                placeholder="https://example.com/avatar.jpg"
                value={formData.avatar_url} 
                onChange={handleChange}
                className="w-full p-2.5 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brutal-yellow"
              />
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
            form="create-person-form"
            disabled={loading}
            className="neo-btn px-4 py-2 bg-brutal-cyan text-black font-black text-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'SAVING...' : 'SAVE PERSON'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
