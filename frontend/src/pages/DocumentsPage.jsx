import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Upload, 
  RefreshCw
} from 'lucide-react';
import { getDocuments, getDocumentDetails, uploadDocument, analyzeDocument, getCases } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cases, setCases] = useState([]);

  // Upload Form State
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'text'
  const [uploadFile, setUploadFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCaseId, setUploadCaseId] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchCases = async () => {
    try {
      const res = await getCases();
      setCases(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await getDocuments();
      setDocs(res);
      if (res.length > 0) {
        const fullDoc = await getDocumentDetails(res[0].document_id);
        setSelectedDoc(fullDoc);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    fetchCases();
  }, []);

  const handleSelectDoc = async (docId) => {
    try {
      const fullDoc = await getDocumentDetails(docId);
      setSelectedDoc(fullDoc);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedDoc) return;
    setAnalyzing(true);
    try {
      const res = await analyzeDocument(selectedDoc.document_id);
      setSelectedDoc(prev => ({
        ...prev,
        extracted_entities: res.entities,
        extracted_relationships: res.relationships
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

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
      if (uploadCaseId) {
        formData.append('case_id', uploadCaseId);
      }
      await uploadDocument(formData);
      setUploadOpen(false);
      setUploadFile(null);
      setRawText('');
      setUploadTitle('');
      fetchDocs();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (loading && docs.length === 0) {
    return <LoadingSpinner message="Loading intelligence repository and NLP models..." />;
  }

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-[1700px] mx-auto overflow-hidden neo-cyber-bg font-mono transition-colors duration-250">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-brutal-purple border-[3px] border-[var(--border-color)] shadow-brutal shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] border-2 border-[var(--border-color)] shadow-brutal-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-black uppercase flex items-center gap-2 flex-wrap">
              <span>UNSTRUCTURED INTELLIGENCE & NLP EXTRACTION</span>
              <span className="neo-badge bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[10px]">
                HYBRID NLP + REGEX
              </span>
            </h1>
            <p className="text-xs text-black/80 font-sans font-medium">
              Extract entities, normalize phone/vehicle IDs, discover relationships, and link evidence directly into the graph
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUploadOpen(true)}
            className="neo-btn px-4 py-2 bg-brutal-yellow text-black font-black text-xs flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>UPLOAD INTEL MEMO</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Document List vs Document Viewer & NLP Spans */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left: Document List */}
        <div className="neo-box overflow-y-auto divide-y-2 divide-[var(--border-color)] p-3 space-y-1 bg-[var(--bg-secondary)] transition-colors">
          <span className="px-3 py-2 text-xs font-black uppercase tracking-wider text-[var(--text-primary)] block">
            INTELLIGENCE REPOSITORY ({docs.length})
          </span>
          {docs.map((d) => {
            const isSelected = selectedDoc?.document_id === d.document_id;
            return (
              <div
                key={d.document_id}
                onClick={() => handleSelectDoc(d.document_id)}
                className={`p-3.5 rounded-lg cursor-pointer transition-all space-y-2 border-2 border-[var(--border-color)] ${
                  isSelected
                    ? 'bg-brutal-yellow text-black shadow-brutal-sm'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`neo-badge text-[10px] ${isSelected ? 'bg-black text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                    {d.document_id}
                  </span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-black' : 'text-[var(--text-secondary)]'}`}>{d.file_type}</span>
                </div>
                <h4 className={`text-xs font-black line-clamp-2 uppercase ${isSelected ? 'text-black' : 'text-[var(--text-primary)]'}`}>
                  {d.title}
                </h4>
                <div className={`flex items-center justify-between text-[11px] ${isSelected ? 'text-black' : 'text-[var(--text-secondary)]'}`}>
                  <span>{d.case_id || 'Syndicate Intel'}</span>
                  <span className={`font-black px-1.5 py-0.5 rounded border border-[var(--border-color)] ${isSelected ? 'bg-white text-black' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>{d.entities_count} Entities</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Document Viewer & Extracted Entity Spans */}
        {selectedDoc ? (
          <div className="lg:col-span-2 neo-box flex flex-col overflow-hidden bg-[var(--bg-secondary)] transition-colors">
            {/* Doc Header */}
            <div className="p-4 bg-[var(--bg-tertiary)] border-b-2 border-[var(--border-color)] flex items-center justify-between shrink-0 transition-colors">
              <div>
                <span className="neo-badge bg-brutal-pink text-black text-[10px]">
                  {selectedDoc.classification} | {selectedDoc.source_agency}
                </span>
                <h3 className="text-sm font-black text-[var(--text-primary)] mt-1 uppercase font-mono">
                  {selectedDoc.title}
                </h3>
              </div>

              <button
                onClick={handleReanalyze}
                disabled={analyzing}
                className="neo-btn px-3 py-1.5 bg-brutal-cyan text-black text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                <span>{analyzing ? 'EXTRACTING...' : 'RE-RUN NLP'}</span>
              </button>
            </div>

            {/* Content & Entities Split View */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto bg-[var(--bg-secondary)]">
              {/* Document Text Box */}
              <div className="p-4 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-color)] space-y-2 overflow-y-auto max-h-[500px] shadow-brutal-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)] block">
                  RAW DOCUMENT TEXT
                </span>
                <pre className="text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap leading-relaxed font-medium">
                  {selectedDoc.content}
                </pre>
              </div>

              {/* Extracted Entities List */}
              <div className="space-y-4 overflow-y-auto max-h-[500px]">
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)] block">
                    EXTRACTED NAMED ENTITIES ({selectedDoc.extracted_entities?.length || 0})
                  </span>
                  <div className="space-y-1.5">
                    {selectedDoc.extracted_entities?.map((ent, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-xs flex items-center justify-between shadow-brutal-sm transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                              {ent.entity_type}
                            </span>
                            <span className="font-black text-[var(--text-primary)]">{ent.extracted_text}</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-secondary)] font-bold">NORM: {ent.normalized_value}</span>
                        </div>
                        <span className="neo-badge bg-brutal-lime text-black text-[10px]">
                          {Math.round(ent.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extracted Relationships */}
                {selectedDoc.extracted_relationships?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t-2 border-[var(--border-color)]">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)] block">
                      DISCOVERED RELATIONSHIPS ({selectedDoc.extracted_relationships.length})
                    </span>
                    <div className="space-y-1.5">
                      {selectedDoc.extracted_relationships.map((rel, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-xs space-y-1 shadow-brutal-sm transition-colors">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-[var(--text-primary)] font-black">{rel.source_text} ➔ {rel.target_text}</span>
                            <span className="neo-badge bg-brutal-yellow text-black text-[10px]">{rel.relationship_type}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)] italic leading-tight">"{rel.evidence_span}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 neo-box flex items-center justify-center p-8 text-[var(--text-secondary)] font-black text-xs bg-[var(--bg-secondary)]">
            SELECT AN INTELLIGENCE MEMO TO VIEW EXTRACTED SPANS & EVIDENCE.
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] rounded-xl p-6 space-y-4 shadow-[8px_8px_0_0_var(--shadow-color)]">
            <h3 className="text-base font-black text-[var(--text-primary)] uppercase">UPLOAD INTELLIGENCE MEMO</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[var(--text-primary)] block mb-1 font-black">DOCUMENT TITLE</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Surveillance Intercept - Safehouse"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-bold focus:outline-none focus:border-brutal-yellow shadow-brutal-sm"
                />
              </div>

              <div>
                <label className="text-[var(--text-primary)] block mb-1 font-black">CASE ASSOCIATION</label>
                <select
                  value={uploadCaseId}
                  onChange={(e) => setUploadCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-bold focus:outline-none focus:border-brutal-yellow shadow-brutal-sm"
                >
                  <option value="">-- No case association --</option>
                  {cases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>{c.case_id}: {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="text-[var(--text-primary)] font-black">UPLOAD METHOD:</label>
                  <div className="flex bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`px-3 py-1 font-bold ${uploadMode === 'file' ? 'bg-brutal-cyan text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      FILE UPLOAD
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('text')}
                      className={`px-3 py-1 font-bold border-l-2 border-[var(--border-color)] ${uploadMode === 'text' ? 'bg-brutal-cyan text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      PASTE RAW TEXT
                    </button>
                  </div>
                </div>

                {uploadMode === 'file' ? (
                  <div>
                    <label className="text-[var(--text-primary)] block mb-1 font-black">FILE (TXT OR PDF)</label>
                    <input
                      type="file"
                      required={uploadMode === 'file'}
                      accept=".txt,.pdf"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="w-full text-[var(--text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-[var(--border-color)] file:text-xs file:font-black file:bg-brutal-yellow file:text-black hover:file:bg-brutal-cyan cursor-pointer"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[var(--text-primary)] block mb-1 font-black">PASTE RAW INTEL REPORT</label>
                    <textarea
                      required={uploadMode === 'text'}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste surveillance logs, intercepted communications, or field notes here..."
                      className="w-full h-40 px-3 py-2 bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-lg text-[var(--text-primary)] font-medium focus:outline-none focus:border-brutal-yellow shadow-brutal-sm resize-y"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUploadOpen(false);
                    setUploadMode('file');
                    setRawText('');
                  }}
                  className="neo-btn px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="neo-btn px-4 py-2 bg-brutal-yellow text-black font-black disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{uploading ? 'PROCESSING NLP...' : 'UPLOAD & EXTRACT'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
