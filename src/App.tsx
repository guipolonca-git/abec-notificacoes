import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  FileCode,
  Github,
  HelpCircle,
  Layers,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { DiffViewer } from './components/DiffViewer';
import { FlowSimulator } from './components/FlowSimulator';
import { TestRunner } from './components/TestRunner';

interface ProbeData {
  success: boolean;
  baseUrl: string;
  activeSlug: string;
  botName: string;
  version: string;
  description: string;
  publishedAt?: string;
  comparison: {
    old: {
      slug: string;
      endpoint: string;
      status: number;
      message: string;
    };
    current: {
      slug: string;
      endpoint: string;
      status: number;
      message: string;
    };
  };
  sampleStartInput?: any;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'diagnostic' | 'script' | 'simulator' | 'test' | 'guide'
  >('diagnostic');
  const [probe, setProbe] = useState<ProbeData | null>(null);
  const [probeLoading, setProbeLoading] = useState(true);
  const [fixedCode, setFixedCode] = useState<string>('');

  const fetchProbe = async () => {
    setProbeLoading(true);
    try {
      const res = await fetch('/api/probe');
      const data = await res.json();
      setProbe(data);
    } catch (err) {
      console.error('Probe failed:', err);
    } finally {
      setProbeLoading(false);
    }
  };

  const fetchCode = async () => {
    try {
      const res = await fetch('/api/script/content');
      const data = await res.json();
      if (data.success) {
        setFixedCode(data.code);
      }
    } catch (err) {
      console.error('Failed to load code:', err);
    }
  };

  useEffect(() => {
    fetchProbe();
    fetchCode();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-sm shadow-teal-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ABECMED Watcher
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  v2.2 Atualizado
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Solução para restauração do bot e monitor de catálogo da ABECMED
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live probe status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    probe?.success ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    probe?.success ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              <span className="text-slate-300 font-mono text-[11px]">
                {probe?.activeSlug || 'bot-abecmed-2-2'}
              </span>
              <button
                onClick={fetchProbe}
                disabled={probeLoading}
                className="text-slate-400 hover:text-white transition cursor-pointer"
                title="Reverificar bot.abecmed.com.br"
              >
                <RefreshCw
                  className={`w-3 h-3 ${probeLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            <a
              href="https://github.com/euamopeitos/abecmed-watcher"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Repo Original</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Quick diagnosis banner */}
        <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border border-teal-800/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-900/60 text-teal-300 border border-teal-700/60">
                <Sparkles className="w-3 h-3 text-teal-300" />
                Diagnóstico Concluído com Sucesso
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Descobrimos exatamente por que o bot quebrou
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                A ABECMED desativou o Typebot antigo (<code>pix-pagamento</code>) e
                publicou a versão <strong>BOT ABECMED 2.2</strong> com o slug{' '}
                <code className="text-teal-300 font-mono">bot-abecmed-2-2</code>.
                Além disso, incluíram uma tela de aviso inicial com botão{' '}
                <span className="text-teal-300 font-medium">&quot;Estou ciente&quot;</span> antes
                da identificação do paciente.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('script')}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-700/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Obter Script Corrigido
              </button>
              <button
                onClick={() => setActiveTab('simulator')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-teal-400" />
                Testar Fluxo no Navegador
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-1 sm:space-x-2 overflow-x-auto pb-px">
          {[
            { id: 'diagnostic', label: '1. Causa Raiz & Status', icon: Activity },
            { id: 'script', label: '2. Script Corrigido (bot.py)', icon: FileCode },
            { id: 'simulator', label: '3. Simulador ao Vivo', icon: MessageSquare },
            { id: 'test', label: '4. Testar com CPF', icon: Terminal },
            { id: 'guide', label: '5. Como Aplicar o Fix', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'border-teal-400 text-teal-300 bg-slate-900/40 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: DIAGNOSTIC */}
        {activeTab === 'diagnostic' && (
          <div className="space-y-6">
            {/* Live endpoint comparison card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old endpoint failure */}
              <div className="bg-slate-900 border border-red-900/50 rounded-xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-red-950 text-red-400 border border-red-800">
                    Endpoint Antigo (do bot.py original)
                  </span>
                  <span className="text-xs font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded">
                    HTTP {probe?.comparison.old.status || 404}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 break-all">
                  POST /api/v1/typebots/<strong>pix-pagamento</strong>/startChat
                </div>
                <div className="text-xs text-red-300/90 leading-relaxed bg-red-950/30 p-3 rounded-lg border border-red-900/30">
                  <strong>Resposta do Servidor:</strong>{' '}
                  <code className="text-red-200">
                    {`{"code":"NOT_FOUND","status":404,"message":"Typebot not found"}`}
                  </code>
                  <p className="mt-1 text-slate-400">
                    A ABECMED despublicou o Typebot com slug &quot;pix-pagamento&quot;.
                  </p>
                </div>
              </div>

              {/* New endpoint success */}
              <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Endpoint Atual da ABECMED
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    HTTP 200 OK
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 break-all">
                  POST /api/v1/typebots/
                  <strong className="text-teal-300">
                    {probe?.activeSlug || 'bot-abecmed-2-2'}
                  </strong>
                  /startChat
                </div>
                <div className="text-xs text-emerald-300/90 leading-relaxed bg-emerald-950/30 p-3 rounded-lg border border-emerald-900/30">
                  <strong>Status Ativo:</strong> Nome:{' '}
                  <span className="text-white font-medium">
                    {probe?.botName || 'BOT ABECMED 2.2'}
                  </span>{' '}
                  (Typebot v{probe?.version || '6.1'}). O bot responde normalmente
                  com a mensagem de acolhimento e opções de fluxo.
                </div>
              </div>
            </div>

            {/* Why it broke detailed breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-teal-400" />
                As 2 Mudanças que Causaram a Falha
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    Slug do Typebot Renomeado / Atualizado
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    No código original do <code>bot.py</code> na linha 44 constava:
                    <br />
                    <code className="text-red-400 font-mono bg-slate-900 px-1 py-0.5 rounded">
                      TYPEBOT = &quot;pix-pagamento&quot;
                    </code>
                    <br />
                    Como o Typebot é gerenciado pela associação na nuvem, quando eles
                    criaram o fluxo 2.2, o slug virou{' '}
                    <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">
                      &quot;bot-abecmed-2-2&quot;
                    </code>
                    .
                  </p>
                  <p className="text-slate-300 font-medium">
                    💡 <strong>Nossa Solução:</strong> Criamos uma função de{' '}
                    <em>autodetecção dinâmica</em> que lê o slug atual direto do HTML
                    da ABECMED. Se amanhã eles lançarem a 2.3, o script não quebra mais!
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    Nova Tela Intersticial de Avisos / Comunicados
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    No fluxo original, logo após o <code>startChat</code>, o bot já
                    oferecia a opção <code>&quot;paciente&quot;</code>.
                    <br />
                    Agora, o bot insere um comunicado inicial (ex: horários de feriado,
                    avisos institucionais) com um botão único{' '}
                    <code className="text-teal-300 font-mono bg-slate-900 px-1 py-0.5 rounded">
                      &quot;Estou ciente&quot;
                    </code>
                    .
                  </p>
                  <p className="text-slate-300 font-medium">
                    💡 <strong>Nossa Solução:</strong> Implementamos a função{' '}
                    <code>reach_paciente()</code>, que pula inteligentemente quaisquer
                    telas de aviso prévio até chegar na opção de associado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCRIPT & DIFF */}
        {activeTab === 'script' && <DiffViewer fixedCode={fixedCode} />}

        {/* TAB 3: SIMULATOR */}
        {activeTab === 'simulator' && (
          <FlowSimulator initialSlug={probe?.activeSlug || 'bot-abecmed-2-2'} />
        )}

        {/* TAB 4: TEST RUNNER */}
        {activeTab === 'test' && (
          <TestRunner defaultSlug={probe?.activeSlug || 'bot-abecmed-2-2'} />
        )}

        {/* TAB 5: HOW TO APPLY */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                Como Fazer o seu Projeto Voltar a Funcionar (Passo a Passo)
              </h3>

              <div className="space-y-6">
                {/* Opção 1: No computador */}
                <div className="border border-slate-800 bg-slate-950 p-5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-xs font-mono">
                        Opção 1
                      </span>
                      Se você roda no seu PC (Windows, Linux ou macOS)
                    </h4>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <li>
                      Baixe o arquivo <strong>bot.py</strong> atualizado clicando na
                      aba <em>&quot;2. Script Corrigido&quot;</em> e no botão{' '}
                      <strong>&quot;Baixar bot.py&quot;</strong>.
                    </li>
                    <li>
                      Substitua o arquivo <code>bot.py</code> existente na pasta do seu
                      projeto <code>abecmed-watcher</code> pelo novo baixado.
                    </li>
                    <li>
                      Abra o terminal/prompt de comando na pasta e teste com:
                      <div className="mt-1 bg-slate-900 p-2.5 rounded font-mono text-xs text-teal-300 border border-slate-800">
                        python3 bot.py --dry-run
                      </div>
                    </li>
                    <li>
                      Pronto! O catálogo de flores e óleos será impresso no terminal,
                      confirmando que o fluxo está restabelecido.
                    </li>
                  </ol>
                </div>

                {/* Opção 2: GitHub Actions */}
                <div className="border border-slate-800 bg-slate-950 p-5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-xs font-mono">
                        Opção 2
                      </span>
                      Se você roda na nuvem via GitHub Actions
                    </h4>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <li>
                      Vá até o seu repositório no GitHub (seu fork de{' '}
                      <code>abecmed-watcher</code>).
                    </li>
                    <li>
                      Abra o arquivo <code>bot.py</code> e clique no ícone de lápis
                      para editar (ou faça um <code>git push</code> com o novo arquivo).
                    </li>
                    <li>
                      Cole o conteúdo do <code>bot.py</code> atualizado e faça o commit
                      na branch principal (<code>main</code>).
                    </li>
                    <li>
                      Acesse a aba <strong>Actions</strong> do repositório, selecione o
                      workflow <code>check</code> e clique em{' '}
                      <strong>Run workflow</strong> para disparar uma verificação
                      imediata.
                    </li>
                  </ol>
                </div>

                {/* Dica sobre ntfy */}
                <div className="p-4 bg-teal-950/30 border border-teal-800/40 rounded-xl text-xs sm:text-sm text-slate-300 space-y-1">
                  <div className="font-semibold text-teal-300 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    Dica sobre as notificações do ntfy:
                  </div>
                  <p className="text-slate-400">
                    Se você apagar o arquivo <code>estado.json</code> local ou nos
                    artefatos da Actions, o script enviará o catálogo completo mais uma
                    vez para o seu aplicativo móvel, confirmando que as notificações
                    estão funcionando em tempo real.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
