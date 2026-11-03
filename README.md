# abecmed-watcher (Atualizado 2026 / Bot 2.2)

Avisa no celular via **ntfy** quando o catálogo do assistente virtual da **ABECMED** mudar — flores novas, óleos ou concentrados voltando ao estoque, preços alterados.

Só Python 3, sem dependências externas (`pip install` desnecessário).

---

## ⚡ O que mudou nesta versão?

1. **Autodetecção do Typebot:** O script não usa mais slug fixo (que causava o erro 404 em `pix-pagamento`). Agora ele descobre automaticamente a versão ativa (`bot-abecmed-2-2`) direto do portal da ABECMED.
2. **Resiliência a Avisos Prévios:** Passa com segurança por avisos de comunicados e feriados antes de solicitar a autenticação de associado.
3. **Suporte a subcompostos:** Coleta flores divididas por compostos (CBD e THC), óleos e concentrados.

---

## 📱 Notificações pelo Celular

1. Instale o app **ntfy** na [Google Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy) ou [App Store](https://apps.apple.com/app/ntfy/id1625396347) (100% grátis e sem cadastro).
2. Toque no **+** e assine o nome do seu tópico (configurado no passo seguinte).

---

## ☁️ Rodando 24/7 na Nuvem via GitHub Actions (Recomendado)

Não precisa deixar o computador ligado:

1. **Faça o Fork ou publique este repositório** na sua conta do GitHub.
2. Acesse **Settings → Secrets and variables → Actions** e crie dois segredos:
   * `ABECMED_CPF`: seu CPF de associado (somente números).
   * `NTFY_TOPIC`: o nome do seu canal no ntfy (ex: `abecmed-seu-nome-aleatorio`).
3. Acesse **Settings → Actions → General → Workflow permissions** e marque **"Read and write permissions"** (essencial para salvar o arquivo de comparação `estado.json`).
4. Na aba **Actions**, ative e clique em **Run workflow** na rotina `check`.

O GitHub verificará a cada ~10 minutos e enviará uma notificação no seu celular sempre que algo mudar no estoque.

---

## 💻 Rodando no seu Computador

### Windows
1. Dê dois cliques em `configurar.bat` e informe seu CPF e tópico do ntfy.
2. Para testar uma vez: dois cliques em `run.bat`.
3. Para monitoramento contínuo: dois cliques em `run-loop.bat`.

### Linux / macOS
```bash
./configurar.sh
./run.sh            # testa uma vez
./run.sh --loop     # monitora continuamente com intervalos variáveis
./run.sh --dry-run  # imprime o catálogo sem notificar
```

---

## 📄 Licença
Distribuído sob licença MIT. Ferramenta independente desenvolvida de associado para associado.
