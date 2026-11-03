#!/usr/bin/env python3
"""abecmed-watch — avisa no celular quando o catalogo da ABECMED muda.

O site (bot.abecmed.com.br) e um Typebot. Este script descobre dinamicamente
o identificador do bot ativo, autentica com o CPF de associado, coleta os produtos
disponiveis em cada categoria (Flores THC/CBD, Concentrados e Oleos) e formata
um relatorio limpo e amigavel (sem mensagens desnecessarias do bot).

Compara com a execucao anterior: se houver novidade ou esgotamento, envia
uma notificacao destacada via ntfy.sh.
"""

import argparse
import configparser
import gzip
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "https://bot.abecmed.com.br"
FALLBACK_TYPEBOT = "bot-abecmed-2-2"
NTFY_BASE = "https://ntfy.sh"

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:154.0) "
        "Gecko/20100101 Firefox/154.0"
    ),
    "Accept": "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
    "Origin": BASE,
    "Referer": BASE + "/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}

TIMEOUT = 30
RETRIES = 3
INTERVALO_MIN = 7
INTERVALO_MAX = 12
MAX_MSG = 3800


class FlowError(Exception):
    """O fluxo do Typebot nao esta onde a gente esperava."""


# ----------------------------------------------------------- Deteccao de Slug
def detect_typebot_slug(base_url=BASE):
    """Descobre o publicId ativo do Typebot na pagina principal da ABECMED."""
    req = urllib.request.Request(
        base_url + "/",
        headers={
            "User-Agent": BROWSER_HEADERS["User-Agent"],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "gzip",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read()
            if resp.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
            html = raw.decode("utf-8", "replace")

            m = re.search(r'"publishedTypebot"\s*:\s*\{[^}]*"publicId"\s*:\s*"([^"]+)"', html)
            if m:
                return m.group(1)

            m2 = re.search(r'"publicId"\s*:\s*"([^"]+)"', html)
            if m2:
                return m2.group(1)
    except Exception as exc:
        print("Aviso: falha na autodeteccao do slug (%s). Usando fallback %s" % (exc, FALLBACK_TYPEBOT), file=sys.stderr)

    return FALLBACK_TYPEBOT


# ---------------------------------------------------------------- HTTP
def post_json(url, payload, headers=None):
    body = json.dumps(payload).encode("utf-8")
    base_headers = dict(BROWSER_HEADERS)
    base_headers.update(headers or {})
    base_headers = {k: v for k, v in base_headers.items() if v is not None}

    last_error = None
    for attempt in range(RETRIES):
        req = urllib.request.Request(url, data=body, method="POST", headers=base_headers)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                raw = resp.read()
                if resp.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                text = raw.decode("utf-8")
                return json.loads(text) if text else {}
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code < 500:
                detail = exc.read().decode("utf-8", "replace")[:300]
                raise FlowError("HTTP %s em %s: %s" % (exc.code, url, detail)) from exc
        except Exception as exc:
            last_error = exc

        if attempt < RETRIES - 1:
            time.sleep(2 ** attempt)

    raise FlowError("falhou apos %d tentativas em %s: %s" % (RETRIES, url, last_error))


# ------------------------------------------------------------- conversa
class ChatSession:
    def __init__(self, slug):
        self.slug = slug
        self.last = post_json(
            "%s/api/v1/typebots/%s/startChat" % (BASE, self.slug),
            {"isStreamEnabled": False, "prefilledVariables": {}, "isOnlyRegistering": False},
            headers={"Origin": BASE, "Referer": BASE + "/"},
        )
        self.session_id = self.last.get("sessionId")
        if not self.session_id:
            raise FlowError("startChat nao devolveu sessionId")

    @property
    def items(self):
        payload = self.last.get("input") or {}
        return [i.get("content", "") for i in payload.get("items", [])]

    @property
    def input_type(self):
        return (self.last.get("input") or {}).get("type")

    @property
    def messages_raw(self):
        return self.last.get("messages", [])

    def send(self, text):
        self.last = post_json(
            "%s/api/v1/sessions/%s/continueChat" % (BASE, self.session_id),
            {"message": {"type": "text", "text": text}},
            headers={"Origin": BASE, "Referer": BASE + "/"},
        )
        return self.last

    def pick(self, pattern, required=True):
        rx = re.compile(pattern, re.I)
        for content in self.items:
            if rx.search(content):
                self.send(content)
                return content
        if required:
            raise FlowError(
                "nenhuma opcao casou com /%s/ — opcoes: %r" % (pattern, self.items)
            )
        return None


# ----------------------------------------------------------------- fluxo
GO_ON = re.compile(r"ciente|entendi|continuar|prosseguir|ok|avançar|avancar", re.I)


def reach_menu(chat, max_hops=6):
    """Avanca pelas telas intermediarias (comunicados, receita, permissoes)."""
    for _ in range(max_hops):
        if any(re.search(r"flor|concentrad|[óo]leo", i, re.I) for i in chat.items):
            return
        if chat.pick(GO_ON.pattern, required=False):
            continue
        if len(chat.items) == 1:
            chat.send(chat.items[0])
            continue
        raise FlowError("nao cheguei no menu principal — opcoes: %r" % (chat.items,))
    raise FlowError("nao cheguei no menu principal depois de %d telas" % max_hops)


def open_authenticated_session(cpf, slug):
    """Inicia sessao, pula avisos preliminares, valida CPF e chega ao menu."""
    chat = ChatSession(slug=slug)

    # Pula telas de comunicados iniciais ate a opcao de paciente
    for _ in range(5):
        if any(re.search(r"paciente", i, re.I) for i in chat.items):
            break
        if chat.pick(GO_ON.pattern, required=False):
            continue
        if len(chat.items) == 1:
            chat.send(chat.items[0])
            continue

    chat.pick(r"paciente")

    if chat.input_type != "text input":
        raise FlowError("esperava campo de CPF, veio %r" % (chat.input_type,))

    res_cpf = chat.send(cpf)

    # Extrai validade da receita
    recipe_days = None
    cpf_msg_text = json.dumps(res_cpf.get("messages", []), ensure_ascii=False)
    if "inválido" in cpf_msg_text.lower():
        raise FlowError("ABECMED recusou o CPF: CPF invalido ou nao cadastrado como associado.")

    m = re.search(r"válida por (\d+)\s*dia", cpf_msg_text, re.I)
    if m:
        recipe_days = m.group(1)

    # Avanca pela tela de receita e permissoes de compra ate o menu de pedidos
    reach_menu(chat)
    return chat, recipe_days


# --------------------------------------------------------- Coleta e Tratamento
def collect(cpf, slug=None):
    """Coleta os dados do catalogo e formata de modo limpo e direto."""
    if not slug:
        slug = detect_typebot_slug()

    main_chat, recipe_days = open_authenticated_session(cpf, slug)
    menu_options = list(main_chat.items)

    thc_flowers = []
    cbd_flowers = []
    concentrates = []
    oils = []

    # 1. Flores
    if any(re.search(r"flor", opt, re.I) for opt in menu_options):
        # THC
        try:
            s_thc, _ = open_authenticated_session(cpf, slug)
            s_thc.pick(r"flor")
            if any(re.search(r"THC", i, re.I) for i in s_thc.items):
                s_thc.pick(r"THC")
                thc_flowers = list(s_thc.items)
        except Exception:
            pass

        # CBD
        try:
            s_cbd, _ = open_authenticated_session(cpf, slug)
            s_cbd.pick(r"flor")
            if any(re.search(r"CBD", i, re.I) for i in s_cbd.items):
                s_cbd.pick(r"CBD")
                cbd_flowers = list(s_cbd.items)
        except Exception:
            pass

    # 2. Concentrados
    if any(re.search(r"concentrad", opt, re.I) for opt in menu_options):
        try:
            s_conc, _ = open_authenticated_session(cpf, slug)
            s_conc.pick(r"concentrad")
            raw_text = json.dumps(s_conc.messages_raw, ensure_ascii=False)
            if "sem estoque" in raw_text.lower():
                concentrates = ["Sem estoque no momento"]
            elif s_conc.items:
                concentrates = list(s_conc.items)
            else:
                concentrates = ["Sem estoque no momento"]
        except Exception:
            concentrates = ["Sem estoque no momento"]

    # 3. Oleos
    if any(re.search(r"[óo]leo", opt, re.I) for opt in menu_options):
        try:
            s_oil, _ = open_authenticated_session(cpf, slug)
            s_oil.pick(r"[óo]leo")
            raw_text = json.dumps(s_oil.messages_raw, ensure_ascii=False)
            if "sem estoque" in raw_text.lower():
                oils = ["Sem estoque no momento"]
            elif s_oil.items:
                oils = list(s_oil.items)
            else:
                oils = ["Sem produtos disponiveis no momento"]
        except Exception:
            oils = ["Sem produtos disponiveis no momento"]

    # Monta relatorio limpo
    sections = []

    if thc_flowers:
        sections.append("🌿 FLORES (THC):\n" + "\n".join("  • %s" % f for f in thc_flowers))

    if cbd_flowers:
        sections.append("🌿 FLORES (CBD):\n" + "\n".join("  • %s" % f for f in cbd_flowers))

    if concentrates:
        sections.append("🧪 CONCENTRADOS:\n" + "\n".join("  • %s" % c for c in concentrates))

    if oils:
        sections.append("💧 OLEOS:\n" + "\n".join("  • %s" % o for o in oils))

    if recipe_days:
        sections.append("📋 Receita medica: valida por mais %s dias" % recipe_days)

    return "\n\n".join(sections)


def diff_products(old_report, new_report):
    """Compara apenas os itens reais de produto, ignorando contagem de dias de receita."""
    def extract_items(text):
        items = set()
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("•") and "Sem estoque" not in line and "Sem produtos" not in line and "valida" not in line:
                items.add(line[1:].strip())
        return items

    old_items = extract_items(old_report)
    new_items = extract_items(new_report)

    novos = new_items - old_items
    esgotados = old_items - new_items

    parts = []
    if novos:
        parts.append("✨ NOVIDADES NO ESTOQUE:\n" + "\n".join("  + %s" % item for item in sorted(novos)))
    if esgotados:
        parts.append("❌ ESGOTOU:\n" + "\n".join("  - %s" % item for item in sorted(esgotados)))

    return "\n\n".join(parts)


# --------------------------------------------------------------- estado
def load_config(path):
    parser = configparser.ConfigParser()
    try:
        parser.read(path, encoding="utf-8")
    except (OSError, configparser.Error):
        return {}
    if not parser.has_section("abecmed"):
        return {}
    return {k: v.strip() for k, v in parser["abecmed"].items()}


def load_state(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def save_state(path, report):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(
            {"report": report, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")},
            fh,
            ensure_ascii=False,
            indent=1,
        )
        fh.write("\n")


# ------------------------------------------------------------ notificacao
def notify(topic, title, message, tags):
    payload = {
        "topic": topic,
        "title": title,
        "message": message[:MAX_MSG],
        "tags": tags,
    }
    post_json(
        NTFY_BASE,
        payload,
        headers={
            "User-Agent": "abecmed-watch",
            "Origin": None,
            "Referer": None,
            "Sec-Fetch-Dest": None,
            "Sec-Fetch-Mode": None,
            "Sec-Fetch-Site": None,
        },
    )


# ------------------------------------------------------------------ main
def ciclo(cpf, topic, state_path, avisou_quebra, slug=None):
    try:
        report = collect(cpf, slug=slug)
    except FlowError as exc:
        print("FALHA: %s" % exc, file=sys.stderr)
        if topic and not avisou_quebra:
            notify(
                topic,
                "abecmed-watch quebrou",
                "O fluxo do bot mudou e o script nao conseguiu navegar.\n\n%s" % exc,
                ["warning"],
            )
        return True

    if avisou_quebra:
        print("voltou a funcionar")
        if topic:
            notify(topic, "abecmed-watch voltou", "Navegacao normalizada.", ["white_check_mark"])

    state = load_state(state_path)
    previous = state.get("report", "")

    # Se o relatorio de produtos for identico, nao notifica
    if report == previous:
        print("%s  sem mudancas no catalogo" % time.strftime("%H:%M"))
        return False

    if not previous:
        title = "Catalogo ABECMED Ativo"
        body = "Primeira execucao. Produtos disponiveis:\n\n%s" % report
        tags = ["seedling"]
    else:
        destaque = diff_products(previous, report)
        # Se os produtos em si nao mudaram (ex: apenas 1 dia a menos na receita), nao dispara notificacao repetida
        if not destaque:
            save_state(state_path, report)
            print("%s  apenas dias de receita atualizaram, sem notificacao" % time.strftime("%H:%M"))
            return False

        title = "ABECMED: Mudanca no Estoque"
        body = "%s\n\nCatalogo atualizado:\n\n%s" % (destaque, report)
        tags = ["bell"]

    notify(topic, title, body, tags)
    save_state(state_path, report)
    print("%s  mudanca detectada, notificacao enviada!" % time.strftime("%H:%M"))
    return False


def main():
    parser = argparse.ArgumentParser(description="Monitor do catalogo da ABECMED (Formato Limpo)")
    parser.add_argument(
        "--config", default=os.path.join(HERE, "config.ini"), help="arquivo de configuracao"
    )
    parser.add_argument(
        "--state", default=os.path.join(HERE, "estado.json"), help="arquivo de estado"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="imprime o relatorio, nao notifica nem salva"
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="fica rodando, com intervalo sorteado entre cada verificacao",
    )
    parser.add_argument(
        "--typebot",
        default="",
        help="slug do typebot (padrao: autodetectado na pagina inicial)",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    cpf = re.sub(r"\D", "", os.environ.get("ABECMED_CPF") or config.get("cpf", ""))
    topic = (
        os.environ.get("NTFY_TOPIC")
        or os.environ.get("NFTY_TOPIC")
        or os.environ.get("TOPICO")
        or config.get("topico", "")
    ).strip()
    slug = args.typebot or os.environ.get("TYPEBOT_SLUG") or config.get("typebot") or None

    def minutos(chave, padrao):
        try:
            return max(1, int(config.get(chave, padrao)))
        except (TypeError, ValueError):
            return padrao

    lo = minutos("intervalo_min", INTERVALO_MIN)
    hi = minutos("intervalo_max", INTERVALO_MAX)
    if hi < lo:
        lo, hi = hi, lo

    if not cpf:
        sys.exit(
            "erro: CPF nao configurado.\n"
            "  Configure no GitHub Secrets como ABECMED_CPF ou no config.ini."
        )
    if len(cpf) != 11:
        sys.exit("erro: CPF tem %d digitos, esperava 11." % len(cpf))

    if not topic and not args.dry_run:
        sys.exit(
            "erro: topico do ntfy nao configurado.\n"
            "  Configure no GitHub Secrets como NTFY_TOPIC ou no config.ini."
        )

    if args.dry_run:
        try:
            print(collect(cpf, slug=slug))
        except FlowError as exc:
            sys.exit("FALHA: %s" % exc)
        return

    if not args.loop:
        quebrou = ciclo(cpf, topic, args.state, False, slug=slug)
        sys.exit(1 if quebrou else 0)

    print("Monitorando. Intervalo sorteado entre %d e %d minutos." % (lo, hi))
    print("Para parar, aperte Ctrl+C.\n")

    avisou_quebra = False
    try:
        while True:
            avisou_quebra = ciclo(cpf, topic, args.state, avisou_quebra, slug=slug)
            espera = random.uniform(lo * 60, hi * 60)
            print("   proxima verificacao em %d min %02d s" % divmod(int(espera), 60)[0:2])
            time.sleep(espera)
    except KeyboardInterrupt:
        print("\nEncerrado.")


if __name__ == "__main__":
    main()
