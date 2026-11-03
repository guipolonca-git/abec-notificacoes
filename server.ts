import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const BASE_BOT_URL = 'https://bot.abecmed.com.br';

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Endpoint: Probe bot.abecmed.com.br and extract active Typebot metadata
  app.get('/api/probe', async (_req: Request, res: Response) => {
    try {
      const probeResponse = await fetch(`${BASE_BOT_URL}/`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!probeResponse.ok) {
        return res.status(502).json({
          success: false,
          error: `Status HTTP ${probeResponse.status} retornado por ${BASE_BOT_URL}`,
        });
      }

      const html = await probeResponse.text();

      // Extract __NEXT_DATA__
      let nextData: any = null;
      const nextDataMatch = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
      );
      if (nextDataMatch && nextDataMatch[1]) {
        try {
          nextData = JSON.parse(nextDataMatch[1]);
        } catch {
          // ignore
        }
      }

      const published = nextData?.props?.pageProps?.publishedTypebot;
      let activeSlug = published?.publicId;

      if (!activeSlug) {
        const m = html.match(/"publicId"\s*:\s*"([^"]+)"/);
        activeSlug = m ? m[1] : 'bot-abecmed-2-2';
      }

      // Test old slug to demonstrate the 404
      let oldSlugStatus = 404;
      try {
        const oldCheck = await fetch(
          `${BASE_BOT_URL}/api/v1/typebots/pix-pagamento/startChat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: BASE_BOT_URL,
              Referer: `${BASE_BOT_URL}/`,
            },
            body: JSON.stringify({ isStreamEnabled: false }),
          }
        );
        oldSlugStatus = oldCheck.status;
      } catch {
        oldSlugStatus = 404;
      }

      // Test new slug
      let newSlugStatus = 200;
      let sampleStartResult = null;
      try {
        const newCheck = await fetch(
          `${BASE_BOT_URL}/api/v1/typebots/${activeSlug}/startChat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Origin: BASE_BOT_URL,
              Referer: `${BASE_BOT_URL}/`,
            },
            body: JSON.stringify({
              isStreamEnabled: false,
              prefilledVariables: {},
              isOnlyRegistering: false,
            }),
          }
        );
        newSlugStatus = newCheck.status;
        if (newCheck.ok) {
          sampleStartResult = await newCheck.json();
        }
      } catch (err: any) {
        newSlugStatus = 500;
      }

      res.json({
        success: true,
        baseUrl: BASE_BOT_URL,
        activeSlug,
        botName: published?.name || 'BOT ABECMED',
        version: published?.version || '6.1',
        description: published?.metadata?.description || '',
        publishedAt: sampleStartResult?.publishedAt || null,
        comparison: {
          old: {
            slug: 'pix-pagamento',
            endpoint: `${BASE_BOT_URL}/api/v1/typebots/pix-pagamento/startChat`,
            status: oldSlugStatus,
            message:
              oldSlugStatus === 404
                ? 'Typebot not found (Defasado/Removido)'
                : `HTTP ${oldSlugStatus}`,
          },
          current: {
            slug: activeSlug,
            endpoint: `${BASE_BOT_URL}/api/v1/typebots/${activeSlug}/startChat`,
            status: newSlugStatus,
            message:
              newSlugStatus === 200
                ? 'Ativo e Respondendo (Sucesso)'
                : `HTTP ${newSlugStatus}`,
          },
        },
        sampleStartInput: sampleStartResult?.input || null,
        sampleMessagesCount: sampleStartResult?.messages?.length || 0,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao conectar com bot.abecmed.com.br',
      });
    }
  });

  // 2. Interactive Flow: Start Chat
  app.post('/api/chat/start', async (req: Request, res: Response) => {
    try {
      const slug = req.body.slug || 'bot-abecmed-2-2';
      const response = await fetch(
        `${BASE_BOT_URL}/api/v1/typebots/${slug}/startChat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: BASE_BOT_URL,
            Referer: `${BASE_BOT_URL}/`,
            'User-Agent':
              'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0',
          },
          body: JSON.stringify({
            isStreamEnabled: false,
            prefilledVariables: {},
            isOnlyRegistering: false,
          }),
        }
      );

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Interactive Flow: Continue Chat
  app.post('/api/chat/continue', async (req: Request, res: Response) => {
    try {
      const { sessionId, message } = req.body;
      if (!sessionId || message === undefined) {
        return res
          .status(400)
          .json({ error: 'sessionId e message são obrigatórios' });
      }

      const response = await fetch(
        `${BASE_BOT_URL}/api/v1/sessions/${sessionId}/continueChat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: BASE_BOT_URL,
            Referer: `${BASE_BOT_URL}/`,
            'User-Agent':
              'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:154.0) Gecko/20100101 Firefox/154.0',
          },
          body: JSON.stringify({
            message: {
              type: 'text',
              text: String(message),
            },
          }),
        }
      );

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Test run fixed bot.py with CPF
  app.post('/api/test-runner', async (req: Request, res: Response) => {
    const { cpf, typebotSlug } = req.body;
    const cleanCpf = (cpf || '').replace(/\D/g, '');

    if (!cleanCpf || cleanCpf.length !== 11) {
      return res.status(400).json({
        success: false,
        error: 'CPF deve conter exatamente 11 dígitos numéricos.',
      });
    }

    try {
      const scriptPath = path.join(__dirname, 'public', 'bot.py');
      const slugArg = typebotSlug
        ? `--typebot ${encodeURIComponent(typebotSlug)}`
        : '';
      const command = `ABECMED_CPF="${cleanCpf}" python3 "${scriptPath}" --dry-run ${slugArg}`;

      const { stdout, stderr } = await execPromise(command, { timeout: 25000 });
      res.json({
        success: true,
        output: stdout,
        logs: stderr,
      });
    } catch (err: any) {
      res.json({
        success: false,
        error: err.stderr || err.stdout || err.message,
      });
    }
  });

  // 5. Script download & view
  app.get('/api/script/content', (_req: Request, res: Response) => {
    try {
      const scriptPath = path.join(__dirname, 'public', 'bot.py');
      const content = fs.readFileSync(scriptPath, 'utf-8');
      res.json({ success: true, code: content });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static & Vite
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ABECMED Watcher Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
