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
  const [uploadFile, setUploadFile] = useState(null);
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
    if (!uploadFile || !uploadTitle) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      if (uploadCaseId) {
        formData.append('case_id', uploadCaseId);
      }
      await uploadDocument(formData);
      setUploadOpen(false);
      setUploadFile(null);
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
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-[1700px] mx-auto overflow-hidden neo-cyber-bg font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-brutal-purple border-[3px] border-black shadow-brutal shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white text-black border-2 border-black shadow-brutal-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-black uppercase flex items-center gap-2">
              <span>UNSTRUCTURED INTELLIGENCE & NLP EXTRACTION</span>
              <span className="neo-badge bg-white text-black text-[10px]">
                HYBRID NLP + REGEX
              </span>
            </h1>
            <p className="text-xs text-slate-900 font-sans font-medium">
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
        <div className="neo-box overflow-y-auto divide-y-2 divide-cream-200 dark:divide-slate-800 p-3 space-y-1 bg-white dark:bg-[#111827]">
          <span className="px-3 py-2 text-xs font-black uppercase tracking-wider text-black dark:text-slate-100 block">
            INTELLIGENCE REPOSITORY ({docs.length})
          </span>
          {docs.map((d) => {
            const isSelected = selectedDoc?.document_id === d.document_id;
            return (
              <div
                key={d.document_id}
                onClick={() => handleSelectDoc(d.document_id)}
                className={`p-3.5 rounded-lg cursor-pointer transition-all space-y-2 border-2 border-black dark:border-slate-700 ${
                  isSelected
                    ? 'bg-brutal-yellow text-black shadow-brutal-sm'
                    : 'bg-cream-100 dark:bg-[#1F2937] hover:bg-cream-200 dark:hover:bg-[#374151]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="neo-badge bg-white text-black text-[10px]">
                    {d.document_id}
                  </span>
                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">{d.file_type}</span>
                </div>
                <h4 className="text-xs font-black text-black dark:text-slate-100 line-clamp-2 uppercase">
                  {d.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                  <span>{d.case_id || 'Syndicate Intel'}</span>
                  <span className="text-black font-black bg-white px-1.5 py-0.5 rounded border border-black">{d.entities_count} Entities</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Document Viewer & Extracted Entity Spans */}
        {selectedDoc ? (
          <div className="lg:col-span-2 neo-box flex flex-col overflow-hidden bg-white dark:bg-[#111827]">
            {/* Doc Header */}
            <div className="p-4 bg-cream-100 dark:bg-[#1F2937] border-b-2 border-black dark:border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <span className="neo-badge bg-brutal-pink text-black text-[10px]">
                  {selectedDoc.classification} | {selectedDoc.source_agency}
                </span>
                <h3 className="text-sm font-black text-black dark:text-slate-100 mt-1 uppercase font-mono">
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
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto bg-white dark:bg-[#111827]">
              {/* Document Text Box */}
              <div className="p-4 rounded-lg bg-cream-50 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 space-y-2 overflow-y-auto max-h-[500px] shadow-brutal-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-slate-100 block">
                  RAW DOCUMENT TEXT
                </span>
                <pre className="text-xs text-slate-900 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed font-medium">
                  {selectedDoc.content}
                </pre>
              </div>

              {/* Extracted Entities List */}
              <div className="space-y-4 overflow-y-auto max-h-[500px]">
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-slate-100 block">
                    EXTRACTED NAMED ENTITIES ({selectedDoc.extracted_entities?.length || 0})
                  </span>
                  <div className="space-y-1.5">
                    {selectedDoc.extracted_entities?.map((ent, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 text-xs flex items-center justify-between shadow-brutal-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                              {ent.entity_type}
                            </span>
                            <span className="font-black text-black dark:text-slate-100">{ent.extracted_text}</span>
                          </div>
                          <span className="text-[10px] text-slate-700 dark:text-slate-400 font-bold">NORM: {ent.normalized_value}</span>
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
                  <div className="space-y-2 pt-2 border-t-2 border-black dark:border-slate-700">
                    <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-slate-100 block">
                      DISCOVERED RELATIONSHIPS ({selectedDoc.extracted_relationships.length})
                    </span>
                    <div className="space-y-1.5">
                      {selectedDoc.extracted_relationships.map((rel, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 text-xs space-y-1 shadow-brutal-sm">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-black dark:text-slate-100 font-black">{rel.source_text} ➔ {rel.target_text}</span>
                            <span className="neo-badge bg-brutal-yellow text-black text-[10px]">{rel.relationship_type}</span>
                          </div>
                          <p className="text-[10px] text-slate-700 dark:text-slate-300 italic leading-tight">"{rel.evidence_span}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 neo-box flex items-center justify-center p-8 text-slate-700 dark:text-slate-300 font-black text-xs bg-white dark:bg-[#111827]">
            SELECT AN INTELLIGENCE MEMO TO VIEW EXTRACTED SPANS & EVIDENCE.
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border-[3px] border-black dark:border-slate-700 rounded-xl p-6 space-y-4 shadow-[8px_8px_0_0_#000000]">
            <h3 className="text-base font-black text-black dark:text-slate-100 uppercase">UPLOAD INTELLIGENCE MEMO</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-900 dark:text-slate-200 block mb-1 font-black">DOCUMENT TITLE</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Surveillance Intercept - Safehouse"
                  className="w-full px-3 py-2 bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 rounded-lg text-black dark:text-slate-100 font-bold focus:outline-none focus:bg-white dark:focus:bg-[#111827] shadow-brutal-sm"
                />
              </div>

              <div>
                <label className="text-slate-900 dark:text-slate-200 block mb-1 font-black">CASE ASSOCIATION</label>
                <select
                  value={uploadCaseId}
                  onChange={(e) => setUploadCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-100 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 rounded-lg text-black dark:text-slate-100 font-bold focus:outline-none shadow-brutal-sm"
                >
                  <option value="">-- No case association --</option>
                  {cases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>{c.case_id}: {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-900 dark:text-slate-200 block mb-1 font-black">FILE (TXT OR PDF)</label>
                <input
                  type="file"
                  required
                  accept=".txt,.pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-black dark:text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-black file:text-xs file:font-black file:bg-brutal-yellow file:text-black hover:file:bg-brutal-cyan cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="neo-btn px-4 py-2 bg-cream-200 dark:bg-[#1F2937] text-black dark:text-slate-200 hover:bg-cream-300"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="neo-btn px-4 py-2 bg-brutal-yellow text-black font-black disabled:opacity-50"
                >
                  {uploading ? 'PROCESSING NLP...' : 'UPLOAD & EXTRACT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
