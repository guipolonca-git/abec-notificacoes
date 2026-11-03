import React, { useState } from 'react';
import { Play, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';

export const TestRunner: React.FC<{ defaultSlug?: string }> = ({
  defaultSlug = 'bot-abecmed-2-2',
}) => {
  const [cpf, setCpf] = useState('');
  const [slug, setSlug] = useState(defaultSlug);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) {
      setError('Por favor, digite um CPF válido com 11 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/test-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: clean, typebotSlug: slug }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao executar teste do bot');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado na execução');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-teal-400" />
            Testar Execução com CPF (Modo Dry-Run)
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Execute o script corrigido em modo <code>--dry-run</code> para validar se seu CPF
            de associado consegue autenticar e coletar o catálogo sem disparar notificações no ntfy.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacidade: Não armazenamos CPF</span>
        </div>
      </div>

      <form onSubmit={handleRunTest} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5">
          <label className="block text-xs font-medium text-slate-300 mb-1">
            CPF do Associado
          </label>
          <input
            type="text"
            value={cpf}
            onChange={handleCpfChange}
            placeholder="000.000.000-00"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono transition"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Slug do Typebot (Autodetectado)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-teal-300 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono transition"
          />
        </div>

        <div className="sm:col-span-3 flex items-end">
          <button
            type="submit"
            disabled={loading || cpf.replace(/\D/g, '').length !== 11}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Navegando no bot...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Executar Teste
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-red-300">Falha na execução:</div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-red-200">
              {error}
            </pre>
          </div>
        </div>
      )}

      {result && result.success && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Execução concluída com sucesso! Relatório do catálogo extraído:
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
            {result.output}
          </div>
        </div>
      )}
    </div>
  );
};
