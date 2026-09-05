import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { ingestCSV } from '../../services/api';

export default function DataUploadWidget({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFile(selectedFiles);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    file.forEach(f => formData.append('files', f));
    
    try {
      await ingestCSV(formData);
      setSuccess(true);
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="neo-box p-5 bg-[var(--bg-secondary)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase font-mono flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Data Ingestion Pipeline
        </h3>
      </div>
      
      {!success ? (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[var(--bg-tertiary)] transition-colors hover:bg-[var(--bg-primary)]">
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-[var(--text-secondary)]" />
              <div className="text-xs font-bold text-[var(--text-primary)]">
                {file ? `${file.length} file(s) selected` : 'Drop CSV files here or click to browse'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] max-w-[200px] mt-1">
                Supports cdr.csv, transactions.csv, cases.csv, etc.
              </div>
            </label>
          </div>
          
          {error && (
            <div className="p-2 rounded bg-brutal-hotpink/10 border border-brutal-hotpink text-brutal-hotpink text-xs font-mono font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full neo-btn py-2.5 bg-brutal-yellow text-black font-black uppercase text-xs flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Pipeline...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Run Ingestion</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-xl border-2 border-[var(--border-color)] bg-brutal-lime/20 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-brutal-lime border-2 border-[var(--border-color)] flex items-center justify-center shadow-brutal-sm text-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-sm">Ingestion Complete</h4>
            <p className="text-xs font-mono text-[var(--text-secondary)] mt-1">Data synced to Graph & DB</p>
          </div>
          <button 
            onClick={() => setSuccess(false)}
            className="text-xs font-bold underline mt-2"
          >
            Upload Another
          </button>
        </div>
      )}
    </div>
  );
}
