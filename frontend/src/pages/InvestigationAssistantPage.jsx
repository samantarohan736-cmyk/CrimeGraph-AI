import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Network, 
  ShieldAlert, 
  FileText,
  Trash2
} from 'lucide-react';
import { queryAssistant } from '../services/api';

const PRESET_QUERIES = [
  "Who are the most connected entities?",
  "Which person bridges two communities?",
  "Show suspicious transaction activity",
  "Which entity has the highest priority score, and why?",
  "Summarize case C001"
];

export default function InvestigationAssistantPage() {
  const [queryInput, setQueryInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('crimegraph_assistant_chat');
    if (saved) return JSON.parse(saved);
    return [
      {
        role: 'assistant',
        answer: "Welcome, Investigator. I am CrimeGraph AI's graph-grounded intelligence assistant. You can query multi-hop criminal connections, transaction spikes, bridge nodes, or prioritization rationale with deterministic evidence citations.",
        structured_findings: [
          "Graph ground-truth active: Multi-modal entities and verified links.",
          "Deterministic reasoning engine with 100% evidence traceability.",
          "Analytical leads generated for triage; not criminal verdicts."
        ],
        supporting_entities: [],
        cited_evidence_ids: ["SYSTEM-INIT"],
        disclaimer: "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. Findings should be reviewed by authorized investigators."
      }
    ];
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    localStorage.setItem('crimegraph_assistant_chat', JSON.stringify(messages));
  }, [messages]);

  const handleSend = async (textToSend) => {
    const q = typeof textToSend === 'string' ? textToSend : queryInput;
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

  const handleClear = () => {
    const initMessage = {
      role: 'assistant',
      answer: "Welcome, Investigator. I am CrimeGraph AI's graph-grounded intelligence assistant. You can query multi-hop criminal connections, transaction spikes, bridge nodes, or prioritization rationale with deterministic evidence citations.",
      structured_findings: [
        "Graph ground-truth active: Multi-modal entities and verified links.",
        "Deterministic reasoning engine with 100% evidence traceability.",
        "Analytical leads generated for triage; not criminal verdicts."
      ],
      supporting_entities: [],
      cited_evidence_ids: ["SYSTEM-INIT"],
      disclaimer: "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. Findings should be reviewed by authorized investigators."
    };
    setMessages([initMessage]);
  };

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col space-y-4 max-w-[1400px] mx-auto overflow-hidden neo-cyber-bg font-mono transition-colors duration-250">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-brutal-blue border-[3px] border-[var(--border-color)] shadow-brutal shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] border-2 border-[var(--border-color)] shadow-brutal-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-black uppercase flex items-center gap-2 flex-wrap">
              <span>GRAPH-GROUNDED INVESTIGATION ASSISTANT</span>
              <span className="neo-badge bg-brutal-yellow text-black text-[10px]">
                EVIDENCE-LINKED
              </span>
            </h1>
            <p className="text-xs text-black/80 font-sans font-medium">
              Query criminal network topologies, trace multi-hop paths, and inspect analytical prioritization rationale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-black font-black">
          <span className="w-2.5 h-2.5 rounded-full bg-brutal-lime border-2 border-[var(--border-color)]"></span>
          <span className="hidden sm:inline">CYPHER & TOPOLOGY ENGINE READY</span>
        </div>
      </div>

      {/* Preset Query Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <span className="text-xs text-[var(--text-secondary)] font-black shrink-0 uppercase">QUICK QUERIES:</span>
        {PRESET_QUERIES.map((pq, i) => (
          <button
            key={i}
            onClick={() => handleSend(pq)}
            className="neo-btn px-3 py-1.5 bg-[var(--bg-secondary)] hover:bg-brutal-yellow hover:text-black text-[var(--text-primary)] text-xs shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>{pq}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] space-y-4 shadow-brutal transition-colors">
        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex justify-end">
                <div className="max-w-2xl p-4 rounded-xl bg-brutal-yellow text-black border-[2.5px] border-[var(--border-color)] font-black text-base shadow-brutal-sm">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex justify-start">
              <div className="max-w-4xl p-6 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] shadow-brutal space-y-4 text-sm">
                {/* Main Response Text */}
                <p className="text-[var(--text-primary)] text-base leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {msg.answer}
                </p>

                {/* Structured Findings List */}
                {msg.structured_findings && msg.structured_findings.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] space-y-1.5 shadow-brutal-sm">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)] block">
                      STRUCTURED FINDINGS:
                    </span>
                    <ul className="space-y-1 text-[var(--text-secondary)] font-sans">
                      {msg.structured_findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[var(--text-primary)] font-black font-mono">›</span>
                          <span className="font-medium">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Supporting Entity Nodes */}
                {msg.supporting_entities && msg.supporting_entities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[var(--text-secondary)] block font-black">
                      RETRIEVED NETWORK ENTITIES:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.supporting_entities.map((node, nIdx) => (
                        <span
                          key={node.id || nIdx}
                          onClick={() => {
                            if(node.type === 'Person') navigate(`/persons/${node.id}`);
                            else if(node.type === 'Case') navigate(`/cases/${node.id}`);
                            else navigate(`/network?focus=${node.id}`);
                          }}
                          className="neo-btn px-2.5 py-1 bg-[var(--bg-secondary)] hover:bg-brutal-cyan hover:text-black text-[var(--text-primary)] cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <Network className="w-3 h-3" />
                          <span>{node.label || node.id}</span>
                          <span className="text-[10px] opacity-70">({node.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cited Evidence IDs */}
                {msg.cited_evidence_ids && msg.cited_evidence_ids.length > 0 && (
                  <div className="pt-2 border-t-2 border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-bold">
                      <FileText className="w-3.5 h-3.5" />
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
                  <div className="p-2 rounded bg-[var(--bg-secondary)] border border-brutal-hotpink/50 text-[10px] text-[var(--text-secondary)] flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-brutal-hotpink shrink-0 mt-0.5" />
                    <span>{msg.disclaimer}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] shadow-brutal-sm flex items-center gap-3 text-xs text-[var(--text-primary)] font-bold">
              <Sparkles className="w-4 h-4 animate-spin text-brutal-cyan" />
              <span>TRAVERSING KNOWLEDGE GRAPH & VERIFYING EVIDENCE CITATIONS...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Query Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative shrink-0 w-full">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="ASK INVESTIGATIVE QUESTION (e.g. 'Who are the most connected entities?')..."
          className="w-full pl-4 pr-[150px] py-4 bg-[var(--bg-secondary)] border-[3px] border-[var(--border-color)] rounded-xl text-base font-bold text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-brutal-yellow shadow-brutal transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="neo-btn p-2 bg-brutal-hotpink text-white font-black flex items-center justify-center border-2 border-[var(--border-color)]"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!queryInput.trim() || loading}
            className="neo-btn px-4 py-2 bg-brutal-yellow text-black font-black text-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            <span>SEND</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
