import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Upload, RefreshCw, ChevronDown, ChevronUp, UserPlus, Database, Network
} from 'lucide-react';
import { getDocuments, getDocumentDetails, analyzeDocument } from '../services/api';

import DataUploadWidget from '../components/dashboard/DataUploadWidget';
import DocumentUploadWidget from '../components/forms/DocumentUploadWidget';
import StandaloneRegistries from '../components/forms/StandaloneRegistries';
import CreatePersonModal from '../components/persons/CreatePersonModal';
import Toast from '../components/common/Toast';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState(null);

  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [showRegistries, setShowRegistries] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const startTime = Date.now();
      const res = await getDocuments();
      setDocs(res || []);
      
      // Ensure the spin animation plays long enough to be visible (min 600ms)
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleSelectDoc = async (docId) => {
    if (selectedDoc?.document_id === docId) {
      setSelectedDoc(null);
      return;
    }
    
    try {
      const details = await getDocumentDetails(docId);
      setSelectedDoc(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReanalyze = async () => {
    if (!selectedDoc) return;
    setAnalyzing(true);
    const startTime = Date.now();
    try {
      await analyzeDocument(selectedDoc.document_id);
      await handleSelectDoc(selectedDoc.document_id);
      
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const showToast = ({ type, message }) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col space-y-6 max-w-[1800px] mx-auto overflow-y-auto neo-cyber-bg font-mono transition-colors duration-250 pb-20">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      
      {isPersonModalOpen && (
        <CreatePersonModal
          isOpen={isPersonModalOpen}
          onClose={() => setIsPersonModalOpen(false)}
          onToast={showToast}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--text-primary)]">
            Data & Intelligence Hub
          </h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1">
            Centralized Command for Ingestion, NLP Extraction, and Graph Profiling.
          </p>
        </div>
      </div>

      {/* TOP INGESTION DECK (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 shrink-0">
        {/* Bulk Data */}
        <div className="flex flex-col h-full">
          <DataUploadWidget onUploadSuccess={() => { showToast({ type: 'success', message: 'Bulk data ingested! Graph updated.'}); fetchDocs(); }} />
        </div>

        {/* NLP Intel */}
        <div className="flex flex-col h-full">
          <DocumentUploadWidget onToast={showToast} onUploadSuccess={fetchDocs} />
        </div>

        {/* Manual Profiling Card */}
        <div className="neo-box p-5 bg-[var(--bg-secondary)] flex flex-col justify-between h-full transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase font-mono flex items-center gap-2 text-[var(--text-primary)]">
                <Network className="w-4 h-4" />
                Graph Profiling
              </h3>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono font-bold">Manual Entity Creation</span>
            </div>
            <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed mb-4">
              Manually profile high-value targets, organizations, or syndicates. Use this tool to build comprehensive network nodes and associate them with existing cases.
            </p>
          </div>
          <button 
            onClick={() => setIsPersonModalOpen(true)}
            className="w-full neo-btn py-2.5 bg-brutal-cyan text-black font-black flex items-center justify-center gap-2 text-xs border-[3px] border-black shadow-[4px_4px_0_0_#000] hover:bg-brutal-lime transition-colors mt-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>CREATE PROFILE (PERSON)</span>
          </button>
        </div>
      </div>

      <hr className="border-t-[3px] border-black my-2" />

      {/* INTELLIGENCE REPOSITORY (Doc List & Viewer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Document List */}
        <div className="neo-box overflow-hidden flex flex-col border-[3px] border-black shadow-[6px_6px_0_0_#000] bg-[var(--bg-secondary)] transition-colors h-[500px]">
          <div className="px-4 py-3 bg-[var(--bg-tertiary)] border-b-[3px] border-black flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
              INTELLIGENCE REPOSITORY ({docs.length})
            </span>
            <button onClick={fetchDocs} disabled={loading} className="neo-btn p-1 bg-black text-white hover:bg-brutal-cyan hover:text-black border-2 border-transparent hover:border-black transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y-[3px] divide-black p-3 space-y-2">
            {docs.map((d) => {
              const isSelected = selectedDoc?.document_id === d.document_id;
              return (
                <div
                  key={d.document_id}
                  onClick={() => handleSelectDoc(d.document_id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all space-y-2 border-[3px] border-black shadow-[4px_4px_0_0_#000] ${
                    isSelected
                      ? 'bg-brutal-yellow text-black'
                      : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 border-[2px] border-black font-black text-[10px] shadow-[2px_2px_0_0_#000] ${isSelected ? 'bg-black text-white' : 'bg-brutal-pink text-black'}`}>
                      {d.document_id}
                    </span>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-black' : 'text-[var(--text-secondary)]'}`}>{d.file_type}</span>
                  </div>
                  <h4 className={`text-xs font-black line-clamp-2 uppercase ${isSelected ? 'text-black' : 'text-[var(--text-primary)]'}`}>
                    {d.title}
                  </h4>
                  <div className={`flex items-center justify-between text-[11px] ${isSelected ? 'text-black' : 'text-[var(--text-secondary)]'}`}>
                    <span>{d.case_id || 'Syndicate Intel'}</span>
                    <span className={`font-black px-1.5 py-0.5 border-[2px] border-black shadow-[2px_2px_0_0_#000] ${isSelected ? 'bg-white text-black' : 'bg-brutal-cyan text-black'}`}>{d.entities_count} Entities</span>
                  </div>
                </div>
              );
            })}
            {docs.length === 0 && !loading && (
              <div className="p-4 text-center text-xs font-bold text-[var(--text-secondary)]">No intelligence documents found.</div>
            )}
          </div>
        </div>

        {/* Right: Document Viewer & Extracted Entity Spans */}
        {selectedDoc ? (
          <div className="lg:col-span-2 neo-box flex flex-col overflow-hidden bg-[var(--bg-secondary)] border-[3px] border-black shadow-[6px_6px_0_0_#000] transition-colors h-[500px]">
            {/* Doc Header */}
            <div className="p-4 bg-[var(--bg-tertiary)] border-b-[3px] border-black flex items-center justify-between shrink-0 transition-colors">
              <div>
                <span className="px-2 py-0.5 border-[2px] border-black font-black text-[10px] shadow-[2px_2px_0_0_#000] bg-brutal-pink text-black">
                  {selectedDoc.classification} | {selectedDoc.source_agency}
                </span>
                <h3 className="text-sm font-black text-[var(--text-primary)] mt-2 uppercase font-mono">
                  {selectedDoc.title}
                </h3>
              </div>

              <button
                onClick={handleReanalyze}
                disabled={analyzing}
                className="neo-btn px-4 py-2 bg-black text-white hover:bg-brutal-cyan hover:text-black hover:border-black border-2 border-transparent text-xs font-black flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{analyzing ? 'EXTRACTING...' : 'RE-RUN NLP'}</span>
              </button>
            </div>

            {/* Content & Entities Split View */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto bg-[var(--bg-secondary)]">
              {/* Document Text Box */}
              <div className="p-4 bg-[var(--bg-primary)] border-[3px] border-black space-y-2 overflow-y-auto h-full shadow-[4px_4px_0_0_#000]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)] block">
                  RAW DOCUMENT TEXT
                </span>
                <pre className="text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap leading-relaxed font-medium">
                  {selectedDoc.content}
                </pre>
              </div>

              {/* Extracted Entities List */}
              <div className="space-y-4 overflow-y-auto h-full pr-2">
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)] block">
                    EXTRACTED NAMED ENTITIES ({selectedDoc.extracted_entities?.length || 0})
                  </span>
                  <div className="space-y-2">
                    {selectedDoc.extracted_entities?.map((ent, i) => (
                      <div key={i} className="p-2.5 bg-[var(--bg-tertiary)] border-[3px] border-black text-xs flex items-center justify-between shadow-[4px_4px_0_0_#000] transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 border-[2px] border-black font-black text-[9px] shadow-[2px_2px_0_0_#000] bg-brutal-cyan text-black">
                              {ent.entity_type}
                            </span>
                            <span className="font-black text-[var(--text-primary)]">{ent.extracted_text}</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-secondary)] font-bold mt-1 block">NORM: {ent.normalized_value}</span>
                        </div>
                        <span className="px-2 py-0.5 border-[2px] border-black font-black text-[10px] shadow-[2px_2px_0_0_#000] bg-brutal-lime text-black">
                          {Math.round(ent.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extracted Relationships */}
                {selectedDoc.extracted_relationships?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t-[3px] border-black">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)] block mt-2">
                      DISCOVERED RELATIONSHIPS ({selectedDoc.extracted_relationships.length})
                    </span>
                    <div className="space-y-2">
                      {selectedDoc.extracted_relationships.map((rel, i) => (
                        <div key={i} className="p-2.5 bg-[var(--bg-tertiary)] border-[3px] border-black text-xs space-y-1 shadow-[4px_4px_0_0_#000] transition-colors">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-[var(--text-primary)] font-black">{rel.source_text} z" {rel.target_text}</span>
                            <span className="px-2 py-0.5 border-[2px] border-black font-black text-[9px] shadow-[2px_2px_0_0_#000] bg-brutal-yellow text-black">{rel.relationship_type}</span>
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
          <div className="lg:col-span-2 neo-box flex items-center justify-center p-8 text-[var(--text-secondary)] font-black text-xs bg-[var(--bg-secondary)] border-[3px] border-black shadow-[6px_6px_0_0_#000] h-[500px]">
            SELECT AN INTELLIGENCE REPORT TO VIEW EXTRACTED SPANS & EVIDENCE.
          </div>
        )}
      </div>

      <hr className="border-t-[3px] border-black my-2" />

      {/* STANDALONE REGISTRIES ACCORDION */}
      <div className="border-[3px] border-black shadow-[6px_6px_0_0_#000] bg-[var(--bg-secondary)] overflow-hidden">
        <button 
          onClick={() => setShowRegistries(!showRegistries)}
          className="w-full p-4 flex items-center justify-between bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-[var(--text-primary)]" />
            <span className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Standalone Asset Registries</span>
          </div>
          {showRegistries ? <ChevronUp className="w-5 h-5 text-[var(--text-primary)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-primary)]" />}
        </button>

        {showRegistries && (
          <div className="p-4 border-t-[3px] border-black bg-[var(--bg-primary)]">
            <StandaloneRegistries onToast={showToast} />
          </div>
        )}
      </div>

    </div>
  );
}
