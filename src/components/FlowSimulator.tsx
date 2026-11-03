import React, { useState } from 'react';
import {
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  raw?: any;
}

interface ChoiceItem {
  id: string;
  content: string;
}

export const FlowSimulator: React.FC<{ initialSlug?: string }> = ({
  initialSlug = 'bot-abecmed-2-2',
}) => {
  const [slug, setSlug] = useState(initialSlug);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [choices, setChoices] = useState<ChoiceItem[]>([]);
  const [inputType, setInputType] = useState<string | null>(null);
  const [inputPlaceholder, setInputPlaceholder] = useState<string>('Mensagem...');
  const [textInputVal, setTextInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to extract plain text from richText nodes
  const extractText = (content: any): string => {
    if (!content) return '';
    if (content.type === 'richText' && Array.isArray(content.richText)) {
      const getStrings = (node: any): string => {
        if (!node) return '';
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(getStrings).join('');
        if (node.children) return getStrings(node.children);
        if (node.text !== undefined) return node.text;
        return '';
      };
      return content.richText
        .map((p: any) => getStrings(p))
        .filter(Boolean)
        .join('\n');
    }
    if (typeof content === 'string') return content;
    return JSON.stringify(content);
  };

  const handleStartChat = async () => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setChoices([]);
    setInputType(null);

    try {
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.message || `Erro HTTP ${res.status}: Typebot não encontrado.`
        );
      }

      const data = await res.json();
      setSessionId(data.sessionId);

      // Process messages
      const botMsgs: Message[] = (data.messages || []).map((m: any) => ({
        id: m.id || Math.random().toString(),
        sender: 'bot',
        text: extractText(m.content),
        raw: m,
      }));
      setMessages(botMsgs);

      // Process input
      if (data.input) {
        setInputType(data.input.type);
        if (data.input.items) {
          setChoices(data.input.items);
        } else {
          setChoices([]);
        }
        if (data.input.options?.labels?.placeholder) {
          setInputPlaceholder(data.input.options.labels.placeholder);
        } else {
          setInputPlaceholder('Digite sua resposta...');
        }
      } else {
        setInputType(null);
        setChoices([]);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao iniciar conversa com o bot');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!sessionId || !textToSend.trim() || loading) return;

    // Add user message to UI
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setTextInputVal('');
    setLoading(true);
    setError(null);
    setChoices([]);

    try {
      const res = await fetch('/api/chat/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: textToSend,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.message || `Erro HTTP ${res.status} ao continuar chat.`
        );
      }

      const data = await res.json();

      const newBotMsgs: Message[] = (data.messages || []).map((m: any) => ({
        id: m.id || Math.random().toString(),
        sender: 'bot',
        text: extractText(m.content),
        raw: m,
      }));

      setMessages((prev) => [...prev, ...newBotMsgs]);

      if (data.input) {
        setInputType(data.input.type);
        if (data.input.items) {
          setChoices(data.input.items);
        } else {
          setChoices([]);
        }
        if (data.input.options?.labels?.placeholder) {
          setInputPlaceholder(data.input.options.labels.placeholder);
        } else {
          setInputPlaceholder('Digite sua resposta...');
        }
      } else {
        setInputType(null);
        setChoices([]);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao processar resposta do bot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Simulador do Fluxo em Tempo Real
            </h3>
            <p className="text-xs text-slate-400">
              Interaja diretamente com a API do Typebot para depurar as etapas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-lg px-2.5 py-1 border border-slate-700 text-xs">
            <span className="text-slate-400 mr-1.5 font-mono">Slug:</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="bg-transparent text-teal-300 font-mono outline-none w-36"
              placeholder="bot-abecmed-2-2"
            />
          </div>

          {!sessionId ? (
            <button
              onClick={handleStartChat}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Iniciar Sessão
            </button>
          ) : (
            <button
              onClick={handleStartChat}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="Reiniciar conversa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </button>
          )}
        </div>
      </div>

      {/* Main chat viewport */}
      <div className="p-4 min-h-[380px] max-h-[500px] overflow-y-auto space-y-3 bg-slate-950/70">
        {!sessionId && !loading && messages.length === 0 && (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-300">
              Nenhuma sessão iniciada
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Clique em &quot;Iniciar Sessão&quot; acima para conectar com a API
              oficial do Typebot e navegar pelas telas de boas-vindas, paciente e
              CPF.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                m.sender === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 border border-slate-700 text-slate-400 rounded-2xl rounded-tl-none px-4 py-2 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              <span>O assistente virtual está digitando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Erro no fluxo: </span>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Input or choices bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        {choices.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-teal-400" />
              Selecione uma opção fornecida pelo bot:
            </div>
            <div className="flex flex-wrap gap-2">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleSendMessage(choice.content)}
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-teal-600/30 hover:border-teal-500 text-slate-200 hover:text-teal-300 border border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
                >
                  {choice.content}
                </button>
              ))}
            </div>
          </div>
        ) : inputType === 'text input' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(textInputVal);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={textInputVal}
              onChange={(e) => setTextInputVal(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !textInputVal.trim()}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </button>
          </form>
        ) : (
          <div className="text-xs text-slate-500 text-center py-1">
            {sessionId
              ? 'Aguardando próxima ação do bot...'
              : 'Clique em "Iniciar Sessão" para carregar as opções.'}
          </div>
        )}
      </div>
    </div>
  );
};
