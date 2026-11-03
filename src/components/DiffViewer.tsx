import React, { useState } from 'react';
import { Copy, Check, Download, ArrowLeftRight, FileCode } from 'lucide-react';

interface DiffViewerProps {
  fixedCode: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ fixedCode }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'diff' | 'full'>('diff');

  const handleCopy = () => {
    navigator.clipboard.writeText(fixedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fixedCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bot.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const diffHighlights = [
    {
      title: '1. Autodetecção dinâmica do Slug do Typebot',
      description:
        'Substitui o TYPEBOT = "pix-pagamento" fixo por uma função que busca a versão ativa direto no HTML do bot.abecmed.com.br.',
      oldCode: `BASE = "https://bot.abecmed.com.br"\nTYPEBOT = "pix-pagamento"`,
      newCode: `BASE = "https://bot.abecmed.com.br"\nFALLBACK_TYPEBOT = "bot-abecmed-2-2"\n\ndef detect_typebot_slug(base_url=BASE):\n    """Descobre o publicId ativo do Typebot na pagina principal da ABECMED."""\n    # Busca dinamicamente no __NEXT_DATA__ ou HTML\n    # Retorna bot-abecmed-2-2 ou versoes futuras automaticamente!`,
    },
    {
      title: '2. Tratamento de telas de avisos / comunicados (reach_paciente)',
      description:
        'A ABECMED adicionou um aviso inicial (ex: comunicados de feriado ou regras) com botão "Estou ciente" antes da tela de seleção de paciente. O script antigo quebrava aqui.',
      oldCode: `def collect(cpf):\n    chat = Chat()\n    sections = []\n    chat.pick(r"paciente")  # Quebrava: tela inicial era "Estou ciente"`,
      newCode: `def reach_paciente(chat, max_hops=5):\n    """Avanca por avisos de feriados/comunicados ate a tela de paciente."""\n    for _ in range(max_hops):\n        if any(PACIENTE_HINT.search(i) for i in chat.items):\n            return\n        if chat.pick(GO_ON.pattern, required=False):\n            continue\n        if len(chat.items) == 1:\n            chat.send(chat.items[0])\n            continue\n\ndef collect(cpf, slug=None):\n    chat = Chat(slug=slug)\n    reach_paciente(chat)  # Avança avisos com segurança\n    chat.pick(r"paciente")`,
    },
    {
      title: '3. Mensagem amigável de validação de CPF',
      description:
        'Se o associado digitar um CPF inválido ou inativo, o script avisa com clareza em vez de estourar erro genérico de tempo limite.',
      oldCode: `if chat.input_type != "text input":\n    raise FlowError("esperava campo de CPF, veio %r" % (chat.input_type,))`,
      newCode: `if chat.input_type == "text input" and "inválido" in chat.text.lower():\n    raise FlowError("ABECMED recusou o CPF: CPF invalido ou nao cadastrado como associado.")`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-teal-400" />
            Código do Script Corrigido (bot.py)
          </h3>
          <p className="text-sm text-slate-400">
            Python 3 puro, sem dependências externas (exatamente como o projeto original).
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-slate-800 p-1 rounded-lg text-xs font-medium text-slate-300">
            <button
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1.5 rounded-md transition ${
                viewMode === 'diff'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'hover:text-white'
              }`}
            >
              Ver Alterações (Diff)
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1.5 rounded-md transition ${
                viewMode === 'full'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'hover:text-white'
              }`}
            >
              Ver Código Completo
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                Copiar
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition"
          >
            <Download className="w-4 h-4" />
            Baixar bot.py
          </button>
        </div>
      </div>

      {viewMode === 'diff' ? (
        <div className="space-y-4">
          <div className="text-sm text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              Abaixo estão os 3 pontos críticos modificados para fazer o bot voltar a funcionar:
            </span>
          </div>

          {diffHighlights.map((diff, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-800">
                <h4 className="text-sm font-semibold text-white">{diff.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{diff.description}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 text-xs font-mono">
                {/* Antigo */}
                <div className="p-3 bg-red-950/20 text-red-300 overflow-x-auto">
                  <div className="text-[10px] uppercase font-bold text-red-400 mb-2 tracking-wider">
                    - Original (Quebrado)
                  </div>
                  <pre className="whitespace-pre">{diff.oldCode}</pre>
                </div>

                {/* Novo */}
                <div className="p-3 bg-emerald-950/20 text-emerald-300 overflow-x-auto">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 mb-2 tracking-wider">
                    + Corrigido (Resiliente)
                  </div>
                  <pre className="whitespace-pre">{diff.newCode}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-800/70 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>bot.py — Código completo pronto para uso</span>
            <span>{fixedCode.split('\n').length} linhas</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed select-all">
            {fixedCode}
          </pre>
        </div>
      )}
    </div>
  );
};
