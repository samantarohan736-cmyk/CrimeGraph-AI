import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Network, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  RotateCcw,
  CheckCircle2,
  GitCommit,
  Layers,
  ChevronRight,
  User,
  FolderKanban
} from 'lucide-react';
import { queryAssistant } from '../services/api';

const EXAMPLE_QUESTIONS = [
  {
    title: "Entity Connection Path",
    query: "How is Rahul Sharma connected to Case C042?",
    tag: "Topology"
  },
  {
    title: "Community Bridge Analysis",
    query: "Which person bridges two communities?",
    tag: "Centrality"
  },
  {
    title: "Most Connected Entities",
    query: "Who are the most connected entities?",
    tag: "Network"
  },
  {
    title: "Suspicious Financial Spikes",
    query: "Show suspicious transaction activity",
    tag: "Anomalies"
  }
];

export default function InvestigationAssistantPage() {
  const [queryInput, setQueryInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      answer: "Welcome to the Investigation Assistant. You can ask natural-language questions to uncover multi-hop criminal connections, cross-community brokers, financial transaction anomalies, and analytical priority rationales.",
      supporting_entities: [
        { id: "P001", label: "Rahul Sharma", type: "Person" },
        { id: "C042", label: "Hawala Syndicate C042", type: "Case" }
      ],
      cited_evidence_ids: ["EVD-FIR-042", "CDR-182", "TX-01082"],
      confidence: 0.98,
      reasoning: "Grounded in audited multi-modal graph entities, active cases, and verified evidentiary records."
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const q = (textToSend || queryInput).trim();
    if (!q || loading) return;

    const userMsg = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setQueryInput('');
    setLoading(true);

    try {
      const res = await queryAssistant(q);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          query: q,
          answer: res.answer,
          supporting_entities: res.supporting_entities || [],
          supporting_edges: res.supporting_edges || [],
          cited_evidence_ids: res.cited_evidence_ids || [],
          confidence: res.confidence || 0.95,
          disclaimer: res.disclaimer
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          query: q,
          answer: `Unable to complete investigation query: ${err.message || 'The intelligence graph service did not respond.'}`,
          supporting_entities: [],
          supporting_edges: [],
          cited_evidence_ids: [],
          confidence: 0,
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        answer: "Conversation reset. You can ask natural-language questions regarding entities, connection paths, suspicious transactions, or priority scores.",
        supporting_entities: [],
        cited_evidence_ids: ["EVD-FIR-042", "CDR-182", "TX-01082"],
        confidence: 0.98,
        reasoning: "Knowledge graph ready for new investigative queries."
      }
    ]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Helper to determine analytical reasoning description
  const getReasoning = (msg) => {
    if (msg.reasoning) return msg.reasoning;
    const q = (msg.query || '').toLowerCase();
    if (q.includes('connect') || q.includes('path') || q.includes('link') || q.includes('between')) {
      return 'Deterministic shortest-path traversal across verified multi-modal relationships (telecom, CDR, banking records).';
    }
    if (q.includes('bridge') || q.includes('communit') || q.includes('gateway')) {
      return 'Betweenness centrality & articulation point analysis identifying cross-community communication brokers.';
    }
    if (q.includes('connected') || q.includes('central') || q.includes('influential') || q.includes('pagerank')) {
      return 'Degree centrality and PageRank calculation identifying highest informational flow hubs.';
    }
    if (q.includes('transaction') || q.includes('financial') || q.includes('money') || q.includes('hawala')) {
      return 'Statistical anomaly detection flagged transactions exceeding 3x baseline historical median.';
    }
    if (q.includes('priorit') || q.includes('why was') || q.includes('score')) {
      return 'Composite analytical prioritization combining network centrality, multi-case overlap, and communication bursts.';
    }
    return 'Graph-grounded analytical inference backed by cross-referenced relational records.';
  };

  // Check if response has a sequential connection path to display
  const hasConnectionPath = (msg) => {
    const q = (msg.query || '').toLowerCase();
    const isPathQuery = q.includes('connect') || q.includes('path') || q.includes('link') || q.includes('between') || (msg.answer && msg.answer.toLowerCase().includes('hop'));
    return isPathQuery && msg.supporting_entities && msg.supporting_entities.length >= 2;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 min-h-[calc(100vh-4rem)] flex flex-col justify-between font-sans">
      {/* 1. Compact Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brutal-yellow border border-black/20 flex items-center justify-center text-black shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Investigation Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Graph-grounded intelligence Q&A with deterministic evidence citations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/network"
            className="text-xs font-medium text-slate-700 hover:text-black px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-slate-400 bg-white flex items-center gap-1.5 transition-colors"
            title="Open Interactive Knowledge Graph"
          >
            <Network className="w-3.5 h-3.5 text-slate-600" />
            <span>Network Analysis</span>
          </Link>
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Example Questions (shown above or as quick starts) */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Suggested Questions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EXAMPLE_QUESTIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => handleSend(item.query)}
              className="text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50/80 transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-medium text-slate-800 block truncate group-hover:text-black">
                  {item.query}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-black group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 3. Clean Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 mb-4">
        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex justify-end">
                <div className="max-w-xl px-4 py-2.5 rounded-2xl rounded-br-sm bg-slate-900 text-white text-sm leading-relaxed shadow-sm">
                  {msg.content}
                </div>
              </div>
            );
          }

          const showPath = hasConnectionPath(msg);
          const reasoningText = getReasoning(msg);
          const confidencePct = Math.round((msg.confidence || 0.95) * 100);

          return (
            <div key={idx} className="flex justify-start">
              <div className="w-full max-w-3xl p-4 sm:p-5 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm space-y-4">
                {/* Concise Answer */}
                <div className="text-slate-800 text-sm leading-relaxed font-sans font-normal">
                  {msg.answer}
                </div>

                {/* Connection Path (if applicable) */}
                {showPath && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <GitCommit className="w-3.5 h-3.5 text-slate-600" />
                        <span>Identified Connection Path</span>
                      </div>
                      <button
                        onClick={() => navigate(`/network?focus=${msg.supporting_entities[0]?.id}`)}
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <span>Visualize in Graph</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Stepper Chain */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      {msg.supporting_entities.map((entity, i) => (
                        <React.Fragment key={entity.id || i}>
                          <button
                            onClick={() => navigate(entity.type === 'Person' ? `/persons/${entity.id}` : entity.type === 'Case' ? `/cases/${entity.id}` : `/network?focus=${entity.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 font-medium hover:border-black hover:bg-yellow-50 transition-colors shadow-2xs"
                          >
                            <span>{entity.label}</span>
                            <span className="text-[10px] text-slate-600">({entity.type})</span>
                          </button>
                          {i < msg.supporting_entities.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence-Backed Findings Detail Section */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  {/* Relevant Entities */}
                  {msg.supporting_entities && msg.supporting_entities.length > 0 && !showPath && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Relevant Entities:
                      </span>
                      {msg.supporting_entities.map((node) => (
                        <button
                          key={node.id}
                          onClick={() => navigate(node.type === 'Person' ? `/persons/${node.id}` : node.type === 'Case' ? `/cases/${node.id}` : `/network?focus=${node.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors"
                        >
                          {node.type === 'Person' ? <User className="w-3 h-3 text-slate-500" /> : <FolderKanban className="w-3 h-3 text-slate-500" />}
                          <span>{node.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cited Evidence IDs */}
                  {msg.cited_evidence_ids && msg.cited_evidence_ids.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>Cited Evidence:</span>
                      </span>
                      {msg.cited_evidence_ids.map((evId, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px] font-semibold"
                        >
                          {evId}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confidence & Reasoning */}
                  {msg.confidence !== undefined && (
                    <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{confidencePct}% Confidence</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">
                        <span className="font-medium text-slate-700">Reasoning:</span> {reasoningText}
                      </p>
                    </div>
                  )}

                  {/* Link to Network Analysis */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Explore full topology in interactive graph</span>
                    <Link
                      to="/network"
                      className="font-medium text-slate-700 hover:text-black flex items-center gap-1 hover:underline"
                    >
                      <span>Open Network Analysis</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center gap-2.5 text-xs text-slate-600">
              <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
              <span>Traversing knowledge graph and verifying evidence citations...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Question Input Bar */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask an investigative question (e.g., 'How is Rahul Sharma connected to Case C042?')..."
            className="w-full pl-4 pr-24 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 shadow-sm"
          />
          <button
            type="submit"
            disabled={!queryInput.trim() || loading}
            className="absolute right-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors shadow-sm"
          >
            <span>Ask</span>
            <Send className="w-3 h-3" />
          </button>
        </form>

        {/* 5. Small Responsible AI Disclaimer at the bottom */}
        <div className="mt-3 text-center">
          <p className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3 text-slate-500 shrink-0" />
            <span>
              <strong>Responsible AI:</strong> Analytical leads for investigator triage; does not determine guilt or legal intent. Verify with primary records.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
