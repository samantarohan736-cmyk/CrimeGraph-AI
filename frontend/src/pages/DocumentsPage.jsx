import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  RefreshCw,
  FileUp,
  Type,
  CheckCircle2,
  AlertCircle,
  X,
  File,
  Briefcase,
  Network,
  ExternalLink,
  Filter
} from 'lucide-react';
import { getDocuments, getDocumentDetails, uploadDocument, analyzeDocument, getCases } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
<<<<<<< HEAD
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('ALL');
  const navigate = useNavigate();
=======
  const [cases, setCases] = useState([]);
>>>>>>> origin/Anirudha

  // Upload Form State
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'text'
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadRawText, setUploadRawText] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
<<<<<<< HEAD
  const [uploadCaseId, setUploadCaseId] = useState(''); // Optional!
=======
  const [uploadCaseId, setUploadCaseId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

<<<<<<< HEAD
  // Distinct cases with docs count
  const casesWithDocsMap = {};
  docs.forEach(d => {
    if (d.case_id) {
      if (!casesWithDocsMap[d.case_id]) {
        casesWithDocsMap[d.case_id] = { case_id: d.case_id, title: d.case_title || `Case ${d.case_id}`, count: 0 };
      }
      casesWithDocsMap[d.case_id].count += 1;
    }
  });
  const casesWithDocs = Object.values(casesWithDocsMap);

  const filteredDocs = selectedCaseFilter === 'ALL'
    ? docs
    : selectedCaseFilter === 'STANDALONE'
      ? docs.filter(d => !d.case_id)
      : docs.filter(d => d.case_id === selectedCaseFilter);

  const handleCaseFilterChange = async (newFilter) => {
    setSelectedCaseFilter(newFilter);
    const subset = newFilter === 'ALL'
      ? docs
      : newFilter === 'STANDALONE'
        ? docs.filter(d => !d.case_id)
        : docs.filter(d => d.case_id === newFilter);
    if (subset.length > 0) {
      try {
        const full = await getDocumentDetails(subset[0].document_id);
        setSelectedDoc(full);
      } catch (err) {
        console.error(err);
      }
    }
  };



  const fetchDocsAndCases = async () => {
    try {
      setLoading(true);
      const [resDocs, resCases] = await Promise.all([
        getDocuments(),
        getCases().catch(() => [])
      ]);
      setDocs(resDocs);
      if (resCases && resCases.length > 0) {
        setCases(resCases);
      }
      if (resDocs.length > 0) {
        const fullDoc = await getDocumentDetails(resDocs[0].document_id);
        setSelectedDoc(fullDoc);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocsAndCases();
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

  const handleFileChange = (file) => {
    if (!file) return;
    setUploadFile(file);
    if (!uploadTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setUploadTitle(cleanName);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const finalTitle = uploadTitle.trim() || (uploadFile ? uploadFile.name : `FIR Intelligence Memo ${new Date().toLocaleDateString()}`);
    
    if (uploadMode === 'file' && !uploadFile) {
      alert('Please select a PDF or TXT file to upload.');
      return;
    }
    if (uploadMode === 'text' && !uploadRawText.trim()) {
      alert('Please enter or paste the FIR / report text.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
<<<<<<< HEAD
      formData.append('title', finalTitle);
      if (uploadCaseId && uploadCaseId.trim()) {
        formData.append('case_id', uploadCaseId.trim());
      }
      if (uploadMode === 'file' && uploadFile) {
        formData.append('file', uploadFile);
      } else if (uploadMode === 'text' && uploadRawText.trim()) {
        formData.append('raw_text', uploadRawText.trim());
      }

      const res = await uploadDocument(formData);
=======
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      if (uploadCaseId) {
        formData.append('case_id', uploadCaseId);
      }
      await uploadDocument(formData);
>>>>>>> origin/Anirudha
      setUploadOpen(false);
      setUploadFile(null);
      setUploadRawText('');
      setUploadTitle('');
      setUploadCaseId('');
      
      const successInfo = res.auto_detected_case 
        ? `${res.message} (Auto-associated with Case ${res.auto_detected_case})`
        : res.message || 'FIR successfully ingested & Knowledge Graph updated.';
      setUploadSuccessMsg(successInfo);
      setTimeout(() => setUploadSuccessMsg(null), 8000);

      await fetchDocsAndCases();
      if (res.document_id) {
        setSelectedCaseFilter('ALL');
        try {
          const newDocDetails = await getDocumentDetails(res.document_id);
          setSelectedDoc(newDocDetails);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error(err);
      alert(`Upload failed: ${err.message || 'Could not process document'}`);
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
              Extract entities, cross-reference criminal database, discover relationships, and link evidence directly into Neo4j
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="neo-btn px-4 py-2 bg-brutal-yellow text-black font-black text-xs flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            UPLOAD FIR / MEMO
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {uploadSuccessMsg && (
        <div className="p-3 bg-brutal-green border-2 border-black rounded-xl text-black font-bold text-xs flex items-center justify-between shadow-brutal-sm">
          <span>{uploadSuccessMsg}</span>
          <button onClick={() => setUploadSuccessMsg(null)} className="font-black text-sm">×</button>
        </div>
      )}


      {/* Main 2-Column Split: Document List vs Document Viewer & NLP Spans */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left: Document List with Case File Filter */}
        <div className="neo-box overflow-hidden flex flex-col p-3 space-y-2 bg-white">
          <div className="space-y-2 pb-2 border-b-2 border-black shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>INTELLIGENCE REPOSITORY ({filteredDocs.length})</span>
              </span>
              <span className="neo-badge bg-cream-200 text-black text-[9px] font-black">
                {docs.length} TOTAL
              </span>
            </div>

            {/* Case Filter Selector */}
            <div>
              <label className="text-[10px] font-black text-slate-700 uppercase block mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>FILTER BY CASE FILE:</span>
              </label>
              <select
                value={selectedCaseFilter}
                onChange={(e) => handleCaseFilterChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-cream-100 border-2 border-black rounded-lg text-black font-bold text-xs focus:outline-none shadow-brutal-sm"
              >
                <option value="ALL">★ ALL CASE FILES ({docs.length} Reports)</option>
                <option value="STANDALONE">★ STANDALONE / UNASSIGNED FIRS ({docs.filter(d => !d.case_id).length})</option>
                <optgroup label="Active Case Files:">
                  {casesWithDocs.map((c) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_id}: {c.title} ({c.count} reports)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Scrollable Doc Items */}
          <div className="overflow-y-auto divide-y-2 divide-cream-200 flex-1 space-y-1 pr-1">
            {filteredDocs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-600 font-medium">
                No reports found for this filter.
              </div>
            ) : (
              filteredDocs.map((d) => {
                const isSelected = selectedDoc?.document_id === d.document_id;
                return (
                  <div
                    key={d.document_id}
                    onClick={() => handleSelectDoc(d.document_id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all space-y-1.5 border-2 border-black ${
                      isSelected
                        ? 'bg-brutal-yellow text-black shadow-brutal-sm'
                        : 'bg-cream-100 hover:bg-cream-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="neo-badge bg-white text-black text-[9px] font-black">
                          {d.document_id}
                        </span>
                        {d.case_id ? (
                          <span className="neo-badge bg-brutal-pink text-black text-[9px] font-black">
                            {d.case_id}
                          </span>
                        ) : (
                          <span className="neo-badge bg-cream-200 text-slate-700 text-[9px]">
                            STANDALONE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-700 font-bold">{d.file_type}</span>
                    </div>

                    <h4 className="text-xs font-black text-black line-clamp-2 uppercase leading-tight">
                      {d.title}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-700 pt-0.5">
                      <span className="truncate max-w-[130px] font-bold">
                        {d.case_title || (d.case_id ? `Case ${d.case_id}` : 'Field Lead')}
                      </span>
                      <span className="text-black font-black bg-white px-1.5 py-0.5 rounded border border-black text-[9px]">
                        {d.entities_count} Entities
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Document Viewer & Extracted Entity Spans */}
        {selectedDoc ? (
          <div className="lg:col-span-2 neo-box flex flex-col overflow-hidden bg-white">
            {/* Case Dossier Navigation Bar */}
            {selectedDoc.case_id && (
              <div className="p-2.5 bg-brutal-pink/20 border-b-2 border-black flex items-center justify-between shrink-0 text-xs">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-black shrink-0" />
                  <span className="font-black text-black">
                    CASE DOSSIER: <span className="underline">{selectedDoc.case_id}</span> {selectedDoc.case_title ? `— ${selectedDoc.case_title}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/cases/${selectedDoc.case_id}`)}
                  className="neo-btn px-2.5 py-1 bg-white hover:bg-brutal-pink text-black font-black text-[10px] flex items-center gap-1"
                >
                  <span>OPEN CASE FILE</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Doc Header */}
            <div className="p-4 bg-cream-100 border-b-2 border-black flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="neo-badge bg-black text-white text-[10px]">
                    {selectedDoc.document_id}
                  </span>
                  <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
                    {selectedDoc.classification}
                  </span>
                  <span className="neo-badge bg-white text-black text-[10px]">
                    {selectedDoc.source_agency}
                  </span>
                </div>
                <h3 className="text-sm font-black text-black mt-1 uppercase font-mono">
                  {selectedDoc.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const matchedSuspect = selectedDoc.extracted_entities?.find(e => e.matched_id)?.matched_id;
                    navigate(`/network?focus=${matchedSuspect || selectedDoc.case_id || 'P001'}`);
                  }}
                  className="neo-btn px-3 py-1.5 bg-brutal-lime text-black text-xs font-black flex items-center gap-1.5"
                  title="Visualize suspect network in Cytoscape"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>EXPLORE IN GRAPH</span>
                </button>
                <button
                  onClick={handleReanalyze}
                  disabled={analyzing}
                  className="neo-btn px-3 py-1.5 bg-brutal-cyan text-black text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                  <span>{analyzing ? 'EXTRACTING...' : 'RE-RUN NLP'}</span>
                </button>
              </div>
            </div>

            {/* Content & Entities Split View */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto bg-white">
              {/* Document Text Box */}
              <div className="p-4 rounded-lg bg-cream-50 border-2 border-black space-y-2 overflow-y-auto max-h-[500px] shadow-brutal-sm">
                <span className="text-[11px] font-black uppercase tracking-wider text-black block">
                  RAW DOCUMENT TEXT
                </span>
                <pre className="text-xs text-slate-900 font-mono whitespace-pre-wrap leading-relaxed font-medium">
                  {selectedDoc.content}
                </pre>
              </div>

              {/* Extracted Entities & Crime Data Connections */}
              <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
                {/* Extracted Named Entities */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-black block">
                    EXTRACTED NAMED ENTITIES ({selectedDoc.extracted_entities?.length || 0})
                  </span>
                  <div className="space-y-1.5">
                    {selectedDoc.extracted_entities?.map((ent, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-cream-100 border-2 border-black text-xs flex items-center justify-between shadow-brutal-sm">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="neo-badge bg-brutal-cyan text-black text-[10px]">
                              {ent.entity_type}
                            </span>
                            <span className="font-black text-black">{ent.extracted_text}</span>
                            {ent.matched_id && (
                              <span 
                                onClick={() => ent.entity_type === 'PERSON' && navigate(`/persons/${ent.matched_id}`)}
                                className="neo-badge bg-brutal-purple text-white text-[9px] cursor-pointer hover:bg-black"
                              >
                                DOSSIER: {ent.matched_id} ↗
                              </span>
                            )}
                            {ent.matched_owner && (
                              <span className="neo-badge bg-brutal-orange text-black text-[9px]">
                                REGISTERED OWNER: {ent.matched_owner}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-700 font-bold block">
                            NORM: {ent.normalized_value}
                            {ent.matched_details?.role && ` • Role: ${ent.matched_details.role}`}
                            {ent.matched_details?.risk_level && ` • Risk: ${ent.matched_details.risk_level}`}
                          </span>
                        </div>
                        <span className="neo-badge bg-brutal-lime text-black text-[10px] shrink-0">
                          {Math.round(ent.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discovered Crime Data Connections */}
                {selectedDoc.extracted_relationships?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t-2 border-black">
                    <span className="text-[11px] font-black uppercase tracking-wider text-black block flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5" />
                      <span>CRIME DATA CONNECTIONS & KNOWLEDGE GRAPH ({selectedDoc.extracted_relationships.length})</span>
                    </span>
                    <div className="space-y-1.5">
                      {selectedDoc.extracted_relationships.map((rel, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-cream-100 border-2 border-black text-xs space-y-1 shadow-brutal-sm">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-black font-black">{rel.source || rel.source_text} ➔ {rel.target || rel.target_text}</span>
                            <span className="neo-badge bg-brutal-yellow text-black text-[10px]">{rel.type || rel.relationship_type}</span>
                          </div>
                          <p className="text-[10px] text-slate-700 italic leading-tight">
                            "{rel.description || rel.evidence_span}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 neo-box flex items-center justify-center p-8 text-slate-700 font-black text-xs bg-white">
            SELECT AN INTELLIGENCE MEMO TO VIEW EXTRACTED SPANS & EVIDENCE.
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] bg-white border-[3px] border-black rounded-xl shadow-[8px_8px_0_0_#000000] font-mono flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b-2 border-black shrink-0 bg-cream-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brutal-yellow text-black border-2 border-black shadow-brutal-sm">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-tight">
                    INGEST POLICE FIR / INVESTIGATIVE REPORT
                  </h3>
                  <p className="text-[11px] text-slate-700 font-sans font-medium">
                    Upload official PDF/TXT reports or paste text directly for AI entity & relationship extraction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadOpen(false)}
                className="p-1 rounded-lg border-2 border-black bg-cream-100 hover:bg-brutal-pink text-black transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
                {/* Input Mode Tabs: File Upload vs Direct Text Paste */}
                <div className="space-y-1.5">
                  <label className="text-slate-900 block font-black uppercase text-[11px]">
                    INPUT METHOD: CHOOSE FILE OR PASTE TEXT
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`py-2 px-3 rounded-lg border-2 border-black font-black text-xs flex items-center justify-center gap-2 transition-all ${
                        uploadMode === 'file'
                          ? 'bg-brutal-yellow text-black shadow-brutal-sm'
                          : 'bg-cream-100 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <File className="w-4 h-4" />
                      <span>UPLOAD FILE (PDF / TXT)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('text')}
                      className={`py-2 px-3 rounded-lg border-2 border-black font-black text-xs flex items-center justify-center gap-2 transition-all ${
                        uploadMode === 'text'
                          ? 'bg-brutal-yellow text-black shadow-brutal-sm'
                          : 'bg-cream-100 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      <span>PASTE TEXT DIRECTLY</span>
                    </button>
                  </div>
                </div>

                {/* Mode 1: File Dropzone */}
                {uploadMode === 'file' && (
                  <div className="space-y-1.5">
                    <label className="text-slate-900 block font-black uppercase text-[11px]">
                      SELECT REPORT FILE (.PDF OR .TXT)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.txt,text/plain,application/pdf"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                      className="hidden"
                    />

                    {!uploadFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-5 border-[2.5px] border-dashed border-black rounded-xl bg-cream-100 hover:bg-cream-200 cursor-pointer text-center space-y-1.5 transition-colors group"
                      >
                        <div className="mx-auto w-9 h-9 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-brutal-sm group-hover:scale-105 transition-transform">
                          <FileUp className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <p className="font-black text-xs text-black">
                            CLICK TO BROWSE OR DRAG & DROP FILE HERE
                          </p>
                          <p className="text-[10px] text-slate-700 font-sans mt-0.5">
                            Supports electronic FIRs, scanned intelligence summaries, and text logs
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-0.5">
                          <span className="neo-badge bg-brutal-cyan text-black text-[9px]">.PDF (PyMuPDF)</span>
                          <span className="neo-badge bg-brutal-lime text-black text-[9px]">.TXT (Plain Text)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-cream-100 border-2 border-black rounded-xl flex items-center justify-between shadow-brutal-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-brutal-green text-black border-2 border-black rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-xs text-black truncate max-w-xs">{uploadFile.name}</p>
                            <p className="text-[10px] text-slate-700">
                              {(uploadFile.size / 1024).toFixed(1)} KB • {uploadFile.name.endsWith('.pdf') ? 'PDF Document' : 'Plain Text File'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="neo-btn px-2.5 py-1 text-[10px] bg-cream-200 hover:bg-brutal-pink text-black font-black"
                        >
                          CHANGE
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode 2: Direct Text Input */}
                {uploadMode === 'text' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-900 font-black uppercase text-[11px]">
                        FIR NARRATIVE / REPORT CONTENT
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadTitle('FIR 2026/091 - Hawala Syndicate Intercept');
                          setUploadRawText(
                            `FIRST INFORMATION REPORT (FIR)\nStation: Central Narcotics & Cyber Unit\n\nSurveillance intercepted suspect Varun Jain meeting with Priya Patel at Riverside Complex in Howrah. Vehicle WB01AB1234 was identified leaving the premises. Call logs demonstrate persistent communications to phone 9876543210. A suspicious cash transfer of INR 450000 was flagged.`
                          );
                        }}
                        className="text-[10px] text-slate-800 underline font-black hover:text-black cursor-pointer"
                      >
                        + Insert Sample Template
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={uploadRawText}
                      onChange={(e) => setUploadRawText(e.target.value)}
                      placeholder="Type or paste FIR content here... e.g. 'Suspect Varun Jain was observed driving vehicle WB01AB1234 near Howrah. Multiple calls to 9876543210 were logged before transferring INR 450,000...'"
                      className="w-full p-2.5 bg-cream-100 border-2 border-black rounded-lg text-black font-mono text-xs focus:outline-none focus:bg-white shadow-brutal-sm resize-none"
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-700">
                      <span>Includes persons, phone numbers, vehicle plates, locations & amounts</span>
                      <span className="font-bold">{uploadRawText.length} characters</span>
                    </div>
                  </div>
                )}

                {/* Document Title */}
                <div>
                  <label className="text-slate-900 block mb-1 font-black uppercase text-[11px]">
                    REPORT / FIR TITLE <span className="text-slate-600 font-normal">(Auto-fills from file if empty)</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. FIR 104/2026 - Narcotics & Hawala Safehouse Raid"
                    className="w-full px-3 py-2 bg-cream-100 border-2 border-black rounded-lg text-black font-bold focus:outline-none focus:bg-white shadow-brutal-sm"
                  />
                </div>

                {/* Case Association (Completely Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-900 font-black uppercase text-[11px]">
                      CASE ASSOCIATION <span className="neo-badge bg-cream-300 text-black text-[9px]">OPTIONAL</span>
                    </label>
                    <span className="text-[10px] text-slate-600">Not required for standalone FIRs</span>
                  </div>
                  <select
                    value={uploadCaseId}
                    onChange={(e) => setUploadCaseId(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-100 border-2 border-black rounded-lg text-black font-bold focus:outline-none shadow-brutal-sm"
                  >
                    <option value="">
                      ★ Standalone FIR / Auto-Detect from Content (Recommended)
                    </option>
                    <optgroup label="Link to Existing Active Case (Optional):">
                      {cases.map((c) => (
                        <option key={c.case_id} value={c.case_id}>
                          {c.case_id}: {c.title}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-[10px] text-slate-600 mt-1">
                    If left unlinked, AI will automatically detect case codes (e.g. C001) mentioned in the report, or register it as a fresh investigative memo.
                  </p>
                </div>

                {/* Automated Processing Pipeline Note */}
                <div className="p-2.5 bg-brutal-cyan/20 border-2 border-black rounded-lg text-[10px] space-y-1">
                  <span className="font-black text-black flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    AUTOMATED INTELLIGENCE PIPELINE:
                  </span>
                  <p className="text-slate-800 font-sans leading-tight">
                    Text extraction ➔ NLP Entity Extraction (Persons, Phones, Vehicles, Locations) ➔ Cross-referencing Criminal Database ➔ Semantic Relationship Detection ➔ Merging into Neo4j Knowledge Graph.
                  </p>
                </div>
              </div>

<<<<<<< HEAD
              {/* Sticky Action Buttons */}
              <div className="flex items-center justify-end gap-2 p-3 border-t-2 border-black bg-cream-100 shrink-0">
=======
              <div>
                <label className="text-slate-900 block mb-1 font-black">CASE ASSOCIATION</label>
                <select
                  value={uploadCaseId}
                  onChange={(e) => setUploadCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-100 border-2 border-black rounded-lg text-black font-bold focus:outline-none shadow-brutal-sm"
                >
                  <option value="">-- No case association --</option>
                  {cases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>{c.case_id}: {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-900 block mb-1 font-black">FILE (TXT OR PDF)</label>
                <input
                  type="file"
                  required
                  accept=".txt,.pdf"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-black file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-black file:text-xs file:font-black file:bg-brutal-yellow file:text-black hover:file:bg-brutal-cyan cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
>>>>>>> origin/Anirudha
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="neo-btn px-4 py-2 bg-cream-200 text-black hover:bg-cream-300 font-black text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="neo-btn px-5 py-2 bg-brutal-yellow text-black font-black disabled:opacity-50 flex items-center gap-2 shadow-brutal-sm text-xs cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>ANALYZING & MERGING TO GRAPH...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>INGEST FIR & EXTRACT ENTITIES</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}
    </div>
  );
}

