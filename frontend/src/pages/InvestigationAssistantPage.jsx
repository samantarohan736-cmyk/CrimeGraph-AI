import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Network, 
  ShieldAlert, 
  FileText
} from 'lucide-react';
import { queryAssistant } from '../services/api';

const PRESET_QUERIES = [
  // "Who are the most connected entities?",
  // "Which person bridges two communities?",
  // "Show suspicious transaction activity",
  // "Which entity has the highest priority score, and why?"
];

export default function InvestigationAssistantPage() {
  const [queryInput, setQueryInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      answer: "Welcome, Investigator. I am CrimeGraph AI's graph-grounded intelligence assistant. You can query multi-hop criminal connections, transaction spikes, bridge nodes, or prioritization rationale with deterministic evidence citations.",
      structured_findings: [
        "Graph ground-truth active: 3 active cases, 44 multi-modal entities, 45 verified links.",
        "Deterministic reasoning engine with 100% evidence traceability.",
        "Analytical leads generated for triage; not criminal verdicts."
      ],
      supporting_entities: [],
      cited_evidence_ids: ["EVD-FIR-042", "CDR-182", "TX-01082"],
      disclaimer: "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. Findings should be reviewed by authorized investigators."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSend = async (textToSend) => {
    const q = textToSend || queryInput;
    if (!q.trim() || loading) return;

    const userMsg = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setQueryInput('');
    setLoading(true);

    try {
      const res = await queryAssistant(q);
      setMessages(prev => [...prev, {
        role: 'assistant',
        answer: res.answer,
        structured_findings: res.structured_findings,
        supporting_entities: res.supporting_entities || [],
        supporting_edges: res.supporting_edges || [],
        cited_evidence_ids: res.cited_evidence_ids || [],
        disclaimer: res.disclaimer
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        answer: `Error processing query: ${err.message || 'Failed to query graph assistant'}`,
        structured_findings: [],
        cited_evidence_ids: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-[1400px] mx-auto overflow-hidden neo-cyber-bg font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-brutal-blue border-[3px] border-black shadow-brutal shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white text-black border-2 border-black shadow-brutal-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-black uppercase flex items-center gap-2">
              <span>GRAPH-GROUNDED INVESTIGATION ASSISTANT</span>
              <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
                EVIDENCE-LINKED
              </span>
            </h1>
            <p className="text-xs text-slate-900 font-sans font-medium">
              Query criminal network topologies, trace multi-hop paths, and inspect analytical prioritization rationale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-black font-black">
          <span className="w-2.5 h-2.5 rounded-full bg-brutal-lime border-2 border-black"></span>
          <span>CYPHER & TOPOLOGY ENGINE READY</span>
        </div>
      </div>

      {/* Preset Query Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <span className="text-xs text-slate-800 dark:text-slate-200 font-black shrink-0 uppercase">QUICK QUERIES:</span>
        {PRESET_QUERIES.map((pq, i) => (
          <button
            key={i}
            onClick={() => handleSend(pq)}
            className="neo-btn px-3 py-1.5 bg-white dark:bg-[#111827] hover:bg-brutal-yellow dark:hover:bg-brutal-yellow text-black dark:text-slate-100 hover:text-black dark:hover:text-black text-xs shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-black dark:text-slate-200" />
            <span>{pq}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-white dark:bg-[#111827] border-[3px] border-black dark:border-slate-700 space-y-4 shadow-brutal">
        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex justify-end">
                <div className="max-w-xl p-4 rounded-xl bg-brutal-yellow text-black border-[2.5px] border-black font-black text-sm shadow-brutal-sm">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex justify-start">
              <div className="max-w-3xl p-5 rounded-xl bg-cream-50 dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 shadow-brutal space-y-4 text-xs">
                {/* Main Response Text */}
                <p className="text-black dark:text-slate-100 text-sm leading-relaxed font-sans font-medium">
                  {msg.answer}
                </p>

                {/* Structured Findings List */}
                {msg.structured_findings && msg.structured_findings.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-white dark:bg-[#111827] border-2 border-black dark:border-slate-700 space-y-1.5 shadow-brutal-sm">
                    <span className="text-[11px] font-black uppercase tracking-wider text-black dark:text-slate-100 block">
                      STRUCTURED FINDINGS:
                    </span>
                    <ul className="space-y-1 text-slate-800 dark:text-slate-200 font-sans">
                      {msg.structured_findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-black dark:text-slate-100 font-black font-mono">›</span>
                          <span className="font-medium">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Supporting Entity Nodes */}
                {msg.supporting_entities && msg.supporting_entities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 block font-black">
                      RETRIEVED NETWORK ENTITIES:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.supporting_entities.map((node) => (
                        <span
                          key={node.id}
                          onClick={() => navigate(node.type === 'Person' ? `/persons/${node.id}` : `/network?focus=${node.id}`)}
                          className="neo-btn px-2.5 py-1 bg-white dark:bg-[#111827] hover:bg-brutal-cyan text-black dark:text-slate-100 hover:text-black dark:hover:text-black cursor-pointer flex items-center gap-1.5"
                        >
                          <Network className="w-3 h-3 text-current" />
                          <span>{node.label}</span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400">({node.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cited Evidence IDs */}
                {msg.cited_evidence_ids && msg.cited_evidence_ids.length > 0 && (
                  <div className="pt-2 border-t-2 border-black dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                      <FileText className="w-3.5 h-3.5 text-black dark:text-slate-300" />
                      <span>CITED EVIDENCE:</span>
                      {msg.cited_evidence_ids.map((ev, i) => (
                        <span key={i} className="neo-badge bg-brutal-yellow text-black text-[10px]">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mandatory Disclaimer */}
                {msg.disclaimer && (
                  <div className="p-2 rounded bg-white dark:bg-[#111827] border border-slate-400 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-black dark:text-slate-300 shrink-0 mt-0.5" />
                    <span>{msg.disclaimer}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="p-4 rounded-xl bg-white dark:bg-[#1F2937] border-2 border-black dark:border-slate-700 shadow-brutal-sm flex items-center gap-3 text-xs text-black dark:text-slate-100 font-bold">
              <Sparkles className="w-4 h-4 animate-spin text-black dark:text-brutal-cyan" />
              <span>TRAVERSING KNOWLEDGE GRAPH & VERIFYING EVIDENCE CITATIONS...</span>
            </div>
          </div>
        )}
      </div>

      {/* Query Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative shrink-0">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="ASK INVESTIGATIVE QUESTION (e.g. 'Who are the most connected entities?')..."
          className="w-full pl-4 pr-28 py-3.5 bg-white dark:bg-[#111827] border-[3px] border-black dark:border-slate-700 rounded-xl text-sm font-bold text-black dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none shadow-brutal"
        />
        <button
          type="submit"
          disabled={!queryInput.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 neo-btn px-4 py-2 bg-brutal-yellow text-black font-black text-xs flex items-center gap-1.5 disabled:opacity-40"
        >
          <span>SEND</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
