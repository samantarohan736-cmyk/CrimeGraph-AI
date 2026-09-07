import React, { useState, useEffect } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';
import { getCases, uploadDocument } from '../../services/api';

export default function DocumentUploadWidget({ onToast, onUploadSuccess }) {
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'text'
  const [uploadFile, setUploadFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaseId, setUploadCaseId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    getCases().then(setCases).catch(console.error);
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle) return;

    let fileToUpload = uploadFile;
    if (uploadMode === 'text') {
      if (!rawText.trim()) return;
      const blob = new Blob([rawText], { type: 'text/plain' });
      fileToUpload = new File([blob], `${uploadTitle.replace(/\s+/g, '_')}.txt`, { type: 'text/plain' });
    } else {
      if (!fileToUpload) return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('title', uploadTitle);
      if (uploadCaseId) formData.append('case_id', uploadCaseId);
      
      await uploadDocument(formData);
      onToast({ type: 'success', message: 'Document uploaded and analyzed successfully!' });
      
      setUploadFile(null);
      setRawText('');
      setUploadTitle('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      onToast({ type: 'error', message: err.message || 'Document upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="neo-box p-5 bg-[var(--bg-secondary)] h-full flex flex-col justify-between transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase font-mono flex items-center gap-2 text-[var(--text-primary)]">
            <FileText className="w-4 h-4" />
            Unstructured Data Insertion
          </h3>
          <span className="text-[10px] text-[var(--text-secondary)] font-mono font-bold">NLP Extraction</span>
        </div>

        <form id="doc-upload-form" onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[var(--text-secondary)] block mb-1 font-black uppercase text-[10px]">DOCUMENT TITLE *</label>
            <input type="text" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. Surveillance Intercept - Safehouse"
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-bold focus:outline-none focus:bg-[var(--bg-primary)] focus:border-brutal-cyan transition-colors"
            />
          </div>
          <div>
            <label className="text-[var(--text-secondary)] block mb-1 font-black uppercase text-[10px]">CASE ASSOCIATION</label>
            <select value={uploadCaseId} onChange={(e) => setUploadCaseId(e.target.value)}
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-bold focus:outline-none focus:bg-[var(--bg-primary)] focus:border-brutal-cyan transition-colors cursor-pointer appearance-none"
            >
              <option value="">-- No case association --</option>
              {cases.map((c) => (
                <option key={c.case_id} value={c.case_id}>{c.case_id}: {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <label className="text-[var(--text-secondary)] font-black uppercase text-[10px] whitespace-nowrap">METHOD:</label>
              <div className="flex bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-xl overflow-hidden">
                <button type="button" onClick={() => setUploadMode('file')}
                  className={`flex-1 px-3 py-1 font-black text-[10px] transition-colors ${uploadMode === 'file' ? 'bg-brutal-pink text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                  FILE UPLOAD
                </button>
                <button type="button" onClick={() => setUploadMode('text')}
                  className={`flex-1 px-3 py-1 font-black text-[10px] border-l-[3px] border-black transition-colors ${uploadMode === 'text' ? 'bg-brutal-pink text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                  PASTE TEXT
                </button>
              </div>
            </div>
            {uploadMode === 'file' ? (
              <div>
                <input type="file" required={uploadMode === 'file'} accept=".txt,.pdf" onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-[var(--text-primary)] file:mr-4 file:py-2 file:px-5 file:border-r-2 file:border-y-0 file:border-l-0 file:border-[var(--border-color)] file:rounded-l-xl file:text-xs file:font-black file:bg-brutal-cyan file:text-black hover:file:bg-brutal-yellow cursor-pointer file:transition-colors bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-xl pl-0 pr-4 mt-2 overflow-hidden transition-colors"
                />
              </div>
            ) : (
              <div>
                <textarea required={uploadMode === 'text'} value={rawText} onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste surveillance logs, intercepted communications, or field notes here..."
                  className="w-full h-16 px-4 py-3 bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] font-medium focus:outline-none focus:bg-[var(--bg-primary)] focus:border-brutal-cyan resize-y transition-colors mt-2"
                />
              </div>
            )}
          </div>
        </form>
      </div>
      <div className="pt-4 mt-auto">
        <button type="submit" form="doc-upload-form" disabled={uploading}
          className="w-full neo-btn py-2.5 bg-brutal-cyan text-black font-black disabled:opacity-50 flex items-center justify-center gap-2 text-xs border-2 border-[var(--border-color)] rounded-xl hover:bg-brutal-yellow transition-colors mt-4">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>EXTRACTING INTEL...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>UPLOAD & ANALYZE</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
