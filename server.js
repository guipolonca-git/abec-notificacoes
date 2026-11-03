var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_fs = __toESM(require("fs"), 1);
var import_child_process = require("child_process");
var import_util = __toESM(require("util"), 1);
var import_meta = {};
var execPromise = import_util.default.promisify(import_child_process.exec);
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var PORT = 3e3;
var BASE_BOT_URL = "https://bot.abecmed.com.br";
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.get("/api/probe", async (_req, res) => {
    try {
      const probeResponse = await fetch(`${BASE_BOT_URL}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      if (!probeResponse.ok) {
        return res.status(502).json({
          success: false,
          error: `Status HTTP ${probeResponse.status} retornado por ${BASE_BOT_URL}`
        });
      }
      const html = await probeResponse.text();
      let nextData = null;
      const nextDataMatch = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
      );
      if (nextDataMatch && nextDataMatch[1]) {
        try {
          nextData = JSON.parse(nextDataMatch[1]);
        } catch {
        }
      }
      const published = nextData?.props?.pageProps?.publishedTypebot;
      let activeSlug = published?.publicId;
      if (!activeSlug) {
        const m = html.match(/"publicId"\s*:\s*"([^"]+)"/);
        activeSlug = m ? m[1] : "bot-abecmed-2-2";
      }
      let oldSlugStatus = 404;
      try {
        const oldCheck = await fetch(
          `${BASE_BOT_URL}/api/v1/typebots/pix-pagamento/startChat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: BASE_BOT_URL,
              Referer: `${BASE_BOT_URL}/`
            },
            body: JSON.stringify({ isStreamEnabled: false })
          }
        );
        oldSlugStatus = oldCheck.status;
      } catch {
        oldSlugStatus = 404;
      }
      let newSlugStatus = 200;
      let sampleStartResult = null;
      try {
        const newCheck = await fetch(
          `${BASE_BOT_URL}/api/v1/typebots/${activeSlug}/startChat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: BASE_BOT_URL,
              Referer: `${BASE_BOT_URL}/`
            },
            body: JSON.stringify({
              isStreamEnabled: false,
              prefilledVariables: {},
              isOnlyRegistering: false
            })
          }
        );
        newSlugStatus = newCheck.status;
        if (newCheck.ok) {
          sampleStartResult = await newCheck.json();
        }
      } catch (err) {
        newSlugStatus = 500;
      }
      res.json({
        success: true,
        baseUrl: BASE_BOT_URL,
        activeSlug,
        botName: published?.name || "BOT ABECMED",
        version: published?.version || "6.1",
        description: published?.metadata?.description || "",
        publishedAt: sampleStartResult?.publishedAt || null,
        comparison: {
          old: {
            slug: "pix-pagamento",
            endpoint: `${BASE_BOT_URL}/api/v1/typebots/pix-pagamento/startChat`,
            status: oldSlugStatus,
            message: oldSlugStatus === 404 ? "Typebot not found (Defasado/Removido)" : `HTTP ${oldSlugStatus}`
          },
          current: {
            slug: activeSlug,
            endpoint: `${BASE_BOT_URL}/api/v1/typebots/${activeSlug}/startChat`,
            status: newSlugStatus,
            message: newSlugStatus === 200 ? "Ativo e Respondendo (Sucesso)" : `HTTP ${newSlugStatus}`
          }
        },
        sampleStartInput: sampleStartResult?.input || null,
        sampleMessagesCount: sampleStartResult?.messages?.length || 0
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || "Erro ao conectar com bot.abecmed.com.br"
      });
    }
  });
  app.post("/api/chat/start", async (req, res) => {
    try {
      const slug = req.body.slug || "bot-abecmed-2-2";
      const response = await fetch(
        `${BASE_BOT_URL}/api/v1/typebots/${slug}/startChat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: BASE_BOT_URL,
            Referer: `${BASE_BOT_URL}/`,
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0"
          },
          body: JSON.stringify({
            isStreamEnabled: false,
            prefilledVariables: {},
            isOnlyRegistering: false
          })
        }
      );
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/chat/continue", async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      if (!sessionId || message === void 0) {
        return res.status(400).json({ error: "sessionId e message s\xE3o obrigat\xF3rios" });
      }
      const response = await fetch(
        `${BASE_BOT_URL}/api/v1/sessions/${sessionId}/continueChat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: BASE_BOT_URL,
            Referer: `${BASE_BOT_URL}/`,
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0"
          },
          body: JSON.stringify({
            message: {
              type: "text",
              text: String(message)
            }
          })
        }
      );
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/test-runner", async (req, res) => {
    const { cpf, typebotSlug } = req.body;
    const cleanCpf = (cpf || "").replace(/\D/g, "");
    if (!cleanCpf || cleanCpf.length !== 11) {
      return res.status(400).json({
        success: false,
        error: "CPF deve conter exatamente 11 d\xEDgitos num\xE9ricos."
      });
    }
    try {
      const scriptPath = import_path.default.join(__dirname, "public", "bot.py");
      const slugArg = typebotSlug ? `--typebot ${encodeURIComponent(typebotSlug)}` : "";
      const command = `ABECMED_CPF="${cleanCpf}" python3 "${scriptPath}" --dry-run ${slugArg}`;
      const { stdout, stderr } = await execPromise(command, { timeout: 25e3 });
      res.json({
        success: true,
        output: stdout,
        logs: stderr
      });
    } catch (err) {
      res.json({
        success: false,
        error: err.stderr || err.stdout || err.message
      });
    }
  });
  app.get("/api/script/content", (_req, res) => {
    try {
      const scriptPath = import_path.default.join(__dirname, "public", "bot.py");
      const content = import_fs.default.readFileSync(scriptPath, "utf-8");
      res.json({ success: true, code: content });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, port: PORT },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static(import_path.default.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ABECMED Watcher Server running on port ${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
