import { apiFetch } from '../lib/api';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Loader2, Bot, User, X, Sparkles, RotateCcw, Copy, Check,
} from 'lucide-react';
import { AuditReportData } from '../types/audit';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isAiGenerated?: boolean;
  timestamp: Date;
}

interface ChatPanelProps {
  manuscriptText: string;
  auditReport: AuditReportData | null;
  history: ChatMessage[];
  onHistoryChange: (msgs: ChatMessage[]) => void;
}

/** Typing indicator dots animation */
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1 px-3 py-2">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
      />
    ))}
  </div>
);

/** Convert response text to formatted JSX (handles basic markdown) */
function formatResponse(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      return (
        <div key={i} className="flex items-start gap-1.5 pl-1">
          <span className="text-sky-400 text-xs mt-0.5 shrink-0">•</span>
          <span>{line.replace(/^[•\-*]\s*/, '')}</span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-1.5" />;
    // Bold text between **
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <div key={i}>
        {parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} className="font-semibold text-white">{p}</strong> : p
        )}
      </div>
    );
  });
}

const QUICK_QUESTIONS = [
  "Pourquoi le style 'nous' est-il prohibé ?",
  "Comment reformuler 'nous avons analysé' ?",
  "Comment citer correctement en APA 7 ?",
  "Quelles sections de fin d'article sont requises ?",
  "Format correct pour les ORCID ?",
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  manuscriptText,
  auditReport,
  history,
  onHistoryChange,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || isLoading) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    const updatedHistory = [...history, userMsg];
    onHistoryChange(updatedHistory);
    setIsLoading(true);

    try {
      const response = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          manuscriptText: manuscriptText.slice(0, 4000),
          auditReport: auditReport ?? undefined,
          history: updatedHistory
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`Erreur serveur (${response.status})`);
      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Réponse vide du serveur.',
        isAiGenerated: data.isAiGenerated,
        timestamp: new Date(),
      };
      onHistoryChange([...updatedHistory, assistantMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠ Erreur de communication avec l'assistant éditorial : ${err.message}`,
        isAiGenerated: false,
        timestamp: new Date(),
      };
      onHistoryChange([...updatedHistory, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, history, manuscriptText, auditReport, onHistoryChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-white/8">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 bg-slate-900 border-b border-white/8">
        <div className="w-7 h-7 rounded-full bg-slate-100 hover:bg-white flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-100">Assistant Éditorial RCST</h3>
          <p className="text-xs text-slate-500">Contexte : manuscrit + rapport d'audit chargés</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => onHistoryChange([])}
            className="ml-auto p-1 rounded hover:bg-white/8 text-slate-500 hover:text-slate-300 transition-colors"
            title="Effacer la conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Welcome state */}
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center px-4 py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 hover:bg-white flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-300 font-medium mb-1">
                Posez vos questions sur le manuscrit
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                L'assistant connaît le contenu du manuscrit et du rapport d'audit en cours.
              </p>
            </div>

            {/* Quick questions */}
            <div className="w-full space-y-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={isLoading}
                  className="w-full text-left text-xs text-slate-300 px-3 py-2 rounded-md bg-white/5 hover:bg-white/8 border border-white/6 hover:border-white/12 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {history.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-slate-700'
                  : 'bg-slate-100 hover:bg-white'
              }`}
            >
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-slate-300" />
                : <Bot className="w-3.5 h-3.5 text-white" />
              }
            </div>

            {/* Bubble */}
            <div className={`group max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`px-3 py-2.5 rounded-lg text-[12px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/6'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="space-y-0.5">{formatResponse(msg.content)}</div>
                ) : (
                  msg.content
                )}
              </div>

              {/* Meta row */}
              <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-slate-600">
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'assistant' && msg.isAiGenerated && (
                  <span className="flex items-center gap-0.5 text-xs text-sky-500">
                    <Sparkles className="w-2.5 h-2.5" /> IA
                  </span>
                )}
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copier"
                  >
                    {copiedId === msg.id
                      ? <Check className="w-3 h-3 text-emerald-400" />
                      : <Copy className="w-3 h-3 text-slate-500 hover:text-slate-300" />
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100 hover:bg-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-800 border border-white/6 rounded-lg rounded-tl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-3 pb-3 pt-2 border-t border-white/8 bg-slate-950">
        <div className="flex items-end gap-2 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 focus-within:border-white/20 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Discutez avec l'assistant éditorial RCST..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none leading-relaxed"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              input.trim() && !isLoading
                ? 'bg-sky-500 hover:bg-sky-400 text-white cursor-pointer'
                : 'bg-white/8 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        <p className="text-xs text-slate-600 text-center mt-1.5">
          Entrée pour envoyer • Maj+Entrée pour saut de ligne
        </p>
      </div>
    </div>
  );
};
